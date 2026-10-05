'use client';

import React, { useState } from 'react';
import { db } from '@/lib/db';
import { tmdbService } from '@/lib/metadata/tmdb';
import { LibraryItem, WatchStatus, MediaType } from '@/lib/types';
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  Film,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface ParsedRow {
  title: string;
  year?: number;
  rating?: number; // 1-10
  status: WatchStatus;
  date?: string;
  imdbId?: string;
  mediaType?: MediaType;
}

// Simple robust CSV parser for browser
function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines: string[] = [];
  let currentRow = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentRow += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (currentRow.trim()) {
        lines.push(currentRow.trim());
      }
      currentRow = '';
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n in \r\n
      }
    } else {
      currentRow += char;
    }
  }
  if (currentRow.trim()) {
    lines.push(currentRow.trim());
  }

  if (lines.length < 2) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const values: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQ = !inQ;
      } else if (c === ',' && !inQ) {
        values.push(cur.trim().replace(/^"|"$/g, '').trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    values.push(cur.trim().replace(/^"|"$/g, '').trim());
    return values;
  };

  const headers = parseLine(lines[0]).map((h) => h.toLowerCase());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const vals = parseLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = vals[idx] || '';
    });
    rows.push(row);
  }

  return { headers, rows };
}

export function CsvImporter({ onImportComplete }: { onImportComplete?: (count: number) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [sourceFormat, setSourceFormat] = useState<'letterboxd' | 'imdb' | 'generic' | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; currentTitle: string } | null>(null);
  const [importResult, setImportResult] = useState<{ added: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setError(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const { headers, rows } = parseCSV(text);

        if (rows.length === 0) {
          setError('CSV file appears empty or unreadable.');
          return;
        }

        // Detect Format
        const isImdb = headers.includes('const') || headers.includes('title type') || headers.includes('imdb rating');
        const isLetterboxd = headers.includes('letterboxd uri') || (headers.includes('name') && headers.includes('year'));

        let format: 'letterboxd' | 'imdb' | 'generic' = 'generic';
        if (isImdb) format = 'imdb';
        else if (isLetterboxd) format = 'letterboxd';

        setSourceFormat(format);

        const parsed: ParsedRow[] = [];

        for (const r of rows) {
          if (format === 'letterboxd') {
            const title = r['name'] || r['title'];
            if (!title) continue;
            const year = r['year'] ? parseInt(r['year'], 10) : undefined;
            const rawRating = r['rating'] ? parseFloat(r['rating']) : undefined;
            // Letterboxd rating is out of 5 stars (0.5 to 5.0) -> convert to 10
            const rating = rawRating ? Math.round(rawRating * 2) : 0;
            const isWatchlist = selected.name.toLowerCase().includes('watchlist');
            const status: WatchStatus = isWatchlist ? 'planned' : 'completed';

            parsed.push({
              title,
              year: isNaN(year!) ? undefined : year,
              rating,
              status,
              date: r['date'],
              mediaType: 'movie', // Letterboxd is almost exclusively films
            });
          } else if (format === 'imdb') {
            const title = r['title'] || r['name'];
            if (!title) continue;
            const year = r['year'] ? parseInt(r['year'], 10) : undefined;
            const yourRating = r['your rating'] ? parseInt(r['your rating'], 10) : 0;
            const titleType = (r['title type'] || '').toLowerCase();
            const mediaType: MediaType = titleType.includes('tv') || titleType.includes('series') ? 'tv' : 'movie';
            const isWatchlist = selected.name.toLowerCase().includes('watchlist') || (!r['your rating'] && !r['date rated']);
            const status: WatchStatus = isWatchlist ? 'planned' : 'completed';

            parsed.push({
              title,
              year: isNaN(year!) ? undefined : year,
              rating: isNaN(yourRating) ? 0 : yourRating,
              status,
              date: r['date rated'] || r['created'],
              imdbId: r['const'],
              mediaType,
            });
          } else {
            // Generic format
            const title = r['title'] || r['name'] || Object.values(r)[0];
            if (!title) continue;
            const year = r['year'] ? parseInt(r['year'], 10) : undefined;
            const rating = r['rating'] ? parseInt(r['rating'], 10) : 0;
            const statusStr = (r['status'] || 'planned').toLowerCase();
            const status: WatchStatus =
              statusStr.includes('complet') || statusStr.includes('watch')
                ? 'completed'
                : 'planned';

            parsed.push({
              title,
              year: isNaN(year!) ? undefined : year,
              rating: isNaN(rating) ? 0 : rating,
              status,
              mediaType: 'movie',
            });
          }
        }

        setParsedRows(parsed);
      } catch (err: any) {
        setError(`Failed to read CSV: ${err.message}`);
      }
    };
    reader.readAsText(selected);
  };

  const handleStartImport = async () => {
    if (parsedRows.length === 0 || isProcessing) return;

    setIsProcessing(true);
    setError(null);
    let added = 0;
    let skipped = 0;

    const deviceSetting = await db.app_settings.get('device_id');
    const deviceId = deviceSetting?.value || 'device_primary';

    // Get current items in library to prevent duplicates
    const currentLibrary = await db.library_items.filter((item) => !item.is_deleted).toArray();
    const existingTitles = new Set(currentLibrary.map((item) => item.title.toLowerCase().trim()));

    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      setProgress({
        current: i + 1,
        total: parsedRows.length,
        currentTitle: row.title,
      });

      if (existingTitles.has(row.title.toLowerCase().trim())) {
        skipped++;
        continue;
      }

      try {
        // Query TMDB metadata to enrich poster, backdrop, genres, runtime
        let tmdbMatch = null;
        try {
          const results = await tmdbService.searchMulti(row.title);
          // Prefer matching year if available
          if (row.year && results.length > 0) {
            tmdbMatch = results.find((r) => {
              const relYear = r.release_date?.substring(0, 4) || r.first_air_date?.substring(0, 4);
              return relYear === String(row.year);
            }) || results[0];
          } else {
            tmdbMatch = results[0] || null;
          }
        } catch {
          // Network or offline: fallback to minimal item
        }

        const now = new Date().toISOString();
        const itemId = `imported_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const matchedType = (tmdbMatch?.media_type as MediaType) || row.mediaType || 'movie';

        const newItem: LibraryItem = {
          id: itemId,
          tmdb_id: tmdbMatch?.id || Math.floor(Math.random() * 900000) + 100000,
          media_type: matchedType,
          title: tmdbMatch?.title || tmdbMatch?.name || row.title,
          original_title: tmdbMatch?.original_title || tmdbMatch?.original_name,
          poster_path: tmdbMatch?.poster_path || null,
          backdrop_path: tmdbMatch?.backdrop_path || null,
          release_date: tmdbMatch?.release_date || tmdbMatch?.first_air_date || (row.year ? `${row.year}-01-01` : undefined),
          release_year: row.year || (tmdbMatch?.release_date ? parseInt(tmdbMatch.release_date.substring(0, 4), 10) : undefined),
          genres: [],
          overview: tmdbMatch?.overview || '',
          runtime: undefined,
          cast: [],
          status: row.status,
          rating: row.rating || 0,
          is_favorite: (row.rating || 0) >= 9,
          notes: row.date ? `Imported from ${sourceFormat || 'CSV'} (logged: ${row.date})` : `Imported from ${sourceFormat || 'CSV'}`,
          finish_date: row.status === 'completed' && row.date ? row.date : undefined,
          rewatch_count: 0,
          created_at: now,
          updated_at: now,
          is_deleted: false,
          sync_version: 1,
          device_id: deviceId,
        };

        await db.library_items.put(newItem);

        // Put to sync queue
        await db.sync_queue.put({
          id: `sync_${newItem.id}_${Date.now()}`,
          entity_type: 'library_item',
          action: 'upsert',
          entity_id: newItem.id,
          payload: newItem,
          timestamp: now,
          status: 'pending',
          retry_count: 0,
        });

        existingTitles.add(row.title.toLowerCase().trim());
        added++;

        // Gentle pause to avoid flooding TMDB rate limits
        if (i % 5 === 0) {
          await new Promise((r) => setTimeout(r, 120));
        }
      } catch (err) {
        console.warn(`Failed to import "${row.title}":`, err);
        skipped++;
      }
    }

    setIsProcessing(false);
    setProgress(null);
    setImportResult({ added, skipped });
    if (onImportComplete) onImportComplete(added);
  };

  return (
    <div className="p-6 rounded-2xl bg-[#11131c] border border-white/5 space-y-4 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <FileText className="w-5 h-5 text-red-500" />
          <h2 className="text-base font-bold text-white">Letterboxd & IMDb CSV Importer</h2>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400">
          Smart Metadata Matcher
        </span>
      </div>

      <p className="text-xs text-slate-400">
        Export your ratings or watchlist from Letterboxd (<code className="text-slate-300">ratings.csv</code>, <code className="text-slate-300">watched.csv</code>) or IMDb (<code className="text-slate-300">ratings.csv</code>) and import them directly into your personal WatchVault offline library.
      </p>

      {/* File Upload Button / Area */}
      {!file ? (
        <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/10 hover:border-red-500/50 rounded-2xl bg-[#141624]/50 hover:bg-[#141624] transition-all cursor-pointer group">
          <Upload className="w-8 h-8 text-slate-400 group-hover:text-red-500 transition-colors mb-2" />
          <span className="text-xs font-semibold text-slate-200">
            Click to upload Letterboxd or IMDb CSV
          </span>
          <span className="text-[11px] text-slate-500 mt-1">
            Supports ratings, watched films, and watchlists
          </span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      ) : (
        <div className="space-y-4">
          {/* File Selected Badge */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#171a28] border border-white/10">
            <div className="flex items-center gap-2.5 min-w-0">
              <Film className="w-4 h-4 text-red-500 shrink-0" />
              <div className="min-w-0">
                <span className="text-xs font-bold text-white truncate block">{file.name}</span>
                <span className="text-[11px] text-slate-400 capitalize">
                  Detected: <strong className="text-slate-200">{sourceFormat || 'CSV'}</strong> format • {parsedRows.length} titles found
                </span>
              </div>
            </div>

            {!isProcessing && (
              <button
                onClick={() => {
                  setFile(null);
                  setParsedRows([]);
                  setImportResult(null);
                }}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-white/5 cursor-pointer"
              >
                Change File
              </button>
            )}
          </div>

          {/* Preview Table of First 4 Titles */}
          {parsedRows.length > 0 && !importResult && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Preview (First 4 Titles):
              </span>
              <div className="space-y-1.5">
                {parsedRows.slice(0, 4).map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/5 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-semibold text-white truncate">{r.title}</span>
                      {r.year && <span className="text-slate-500 font-mono text-[11px]">({r.year})</span>}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {r.rating ? (
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono text-[10px] font-bold">
                          ★ {r.rating}/10
                        </span>
                      ) : null}
                      <span className="px-2 py-0.5 rounded bg-white/10 text-slate-300 font-mono text-[10px] uppercase font-bold">
                        {r.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress Bar during import */}
          {isProcessing && progress && (
            <div className="p-4 rounded-xl bg-[#171a28] border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white font-semibold flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
                  <span>Matching with TMDB...</span>
                </span>
                <span className="text-slate-400 font-mono text-[11px]">
                  {progress.current} / {progress.total}
                </span>
              </div>

              <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full bg-red-600 transition-all duration-150"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-400 truncate">
                Current: <span className="text-white font-medium">{progress.currentTitle}</span>
              </p>
            </div>
          )}

          {/* Import Result Notification */}
          {importResult && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                <span>Import Successfully Completed!</span>
              </div>
              <p className="text-xs text-slate-300">
                Added <strong className="text-white font-semibold">{importResult.added}</strong> new titles to your offline library ({importResult.skipped} duplicates or skipped).
              </p>
            </div>
          )}

          {/* Start Import Action Button */}
          {!isProcessing && !importResult && (
            <button
              onClick={handleStartImport}
              className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-900/30"
            >
              <Sparkles className="w-4 h-4" />
              <span>Import & Match {parsedRows.length} Titles into Library</span>
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
