import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, AlertCircle, FileJson, CheckCircle2, TreeDeciduous, RefreshCcw, Layers } from 'lucide-react';

interface Hierarchy {
  root: string;
  tree: any;
  depth?: number;
  has_cycle?: boolean;
}

interface ApiResponse {
  user_id: string;
  email_id: string;
  college_roll_number: string;
  hierarchies: Hierarchy[];
  invalid_entries: string[];
  duplicate_edges: string[];
  summary: {
    total_trees: number;
    total_cycles: number;
    largest_tree_root: string;
  };
}

export default function App() {
  const [input, setInput] = useState('["A->B", "A->C", "B->D", "E->F", "G->G", "H->I", "I->H"]');
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      let dataToSend: string[] = [];
      const trimmedInput = input.trim();

      if (trimmedInput.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmedInput);
          if (parsed && Array.isArray(parsed.data)) {
            dataToSend = parsed.data;
          } else {
            throw new Error('JSON object must contain a "data" array.');
          }
        } catch (e: any) {
          throw new Error('Invalid JSON format. If you are entering a JSON object, make sure it has a "data" property containing an array of strings.');
        }
      } else if (trimmedInput.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmedInput);
          if (Array.isArray(parsed)) {
            dataToSend = parsed;
          } else {
            throw new Error('Input must be an array of strings.');
          }
        } catch (e) {
          throw new Error('Invalid JSON array format.');
        }
      } else {
        dataToSend = trimmedInput.split(',').map(s => s.trim()).filter(s => s.length > 0);
      }

      if (dataToSend.length === 0) {
        throw new Error('No valid input provided.');
      }

      const res = await fetch('/bfhl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: dataToSend }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to process data');
      }

      const data: ApiResponse = await res.json();
      setResponse(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExample = (example: string) => {
    setInput(example);
    setResponse(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <TreeDeciduous className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">SRM Hierarchy <span className="text-indigo-600">Builder</span></h1>
          </div>
          {response && (
            <div className="hidden md:flex items-center gap-4 text-sm text-slate-500 font-medium">
              <span>{response.user_id}</span>
              <div className="w-4 h-[1px] bg-slate-300" />
              <span>{response.college_roll_number}</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Input Section */}
        <div className="lg:col-span-4 space-y-6">
          <section id="input-card" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              Input Edges
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Edges (JSON or Comma separated)
                </label>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="w-full h-40 p-4 font-mono text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none shadow-inner"
                  placeholder='A->B, B->C'
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest w-full border-b border-slate-100 pb-1 mb-1">Quick Examples</span>
                <button onClick={() => handleExample('A->B, A->C, B->D, E->F')} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-bold transition-colors">Multiple Trees</button>
                <button onClick={() => handleExample('A->B, B->C, C->A')} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-bold transition-colors">Pure Cycle</button>
                <button onClick={() => handleExample('A->B, A->B, G->5, a->b')} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-bold transition-colors">Edge Cases</button>
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200 active:scale-[0.98]"
              >
                {loading ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                {loading ? 'Processing...' : 'Build Hierarchy'}
              </button>
            </div>
          </section>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bg-red-50 border border-red-100 p-4 rounded-xl flex gap-3 text-red-700"
              >
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Output Section */}
        <div className="lg:col-span-8 space-y-6">
          {!response && !loading && !error && (
            <div className="h-[400px] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl">
              <FileJson className="w-12 h-12 mb-4 opacity-20" />
              <p className="font-medium text-lg">Response will appear here</p>
              <p className="text-sm">Submit your valid edge array to get started</p>
            </div>
          )}

          {response && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Summary Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard label="Valid Trees" value={response.summary.total_trees} color="text-emerald-600" />
                <StatCard label="Cyclic Groups" value={response.summary.total_cycles} color="text-amber-600" />
                <StatCard label="Largest Root" value={response.summary.largest_tree_root || 'N/A'} color="text-indigo-600" />
              </div>

              {/* Detail Tabs/Sections */}
              <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wider">
                    <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                    Process Results
                  </h3>
                </div>
                
                <div className="p-6">
                  <div className="space-y-8">
                    {/* Hierarchies List */}
                    <div>
                      <div className="grid grid-cols-1 gap-4">
                        {response.hierarchies.map((h, i) => (
                          <div key={i} className={`p-6 rounded-2xl border ${h.has_cycle ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50 border-slate-200 hover:border-indigo-200 transition-all'}`}>
                            <div className="flex justify-between items-center mb-6">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm ${h.has_cycle ? 'bg-amber-200 text-amber-800' : 'bg-indigo-600 text-white'}`}>
                                  {h.root}
                                </div>
                                <div>
                                  <span className="font-bold text-slate-900 block">Hierarchy {h.root}</span>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h.has_cycle ? 'Cyclic' : 'Tree'}</span>
                                </div>
                              </div>
                              {h.has_cycle ? (
                                <span className="bg-amber-200 text-amber-800 text-[10px] font-black px-2 py-1 rounded uppercase flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" /> Cycle
                                </span>
                              ) : (
                                <div className="flex flex-col items-end">
                                  <span className="bg-emerald-200 text-emerald-800 text-[10px] font-black px-2 py-1 rounded uppercase">
                                    Depth: {h.depth}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            <div className="space-y-2">
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Structure</p>
                               <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-inner overflow-x-auto">
                                  <pre className="text-xs font-mono leading-relaxed text-indigo-900">
                                    {JSON.stringify(h.tree, null, 2)}
                                  </pre>
                                </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Edge Lists */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                      <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-red-500" />
                          Invalid Entries
                        </h4>
                        {response.invalid_entries.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {response.invalid_entries.map((entry, i) => (
                              <span key={i} className="bg-white text-red-600 px-3 py-1 rounded-lg text-xs font-bold border border-red-100 shadow-sm">
                                {entry}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">Clean input</p>
                        )}
                      </div>
                      <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <RefreshCcw className="w-4 h-4 text-slate-400" />
                          Duplicate Edges
                        </h4>
                        {response.duplicate_edges.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {response.duplicate_edges.map((entry, i) => (
                              <span key={i} className="bg-white text-slate-600 px-3 py-1 rounded-lg text-xs font-bold border border-slate-200 shadow-sm">
                                {entry}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No duplicates</p>
                        )}
                      </div>
                    </div>

                    {/* raw JSON toggle */}
                    <div className="pt-6 border-t border-slate-100">
                       <details className="group">
                         <summary className="text-xs font-bold text-indigo-600 cursor-pointer uppercase tracking-wider list-none flex items-center gap-1 hover:text-indigo-700">
                           <span>{'{'} View Raw Response {'}'}</span>
                         </summary>
                         <div className="mt-4 p-4 bg-slate-900 rounded-xl overflow-x-auto">
                            <pre className="text-xs font-mono text-indigo-300">
                              {JSON.stringify(response, null, 2)}
                            </pre>
                         </div>
                       </details>
                    </div>
                  </div>
                </div>
              </section>
            </motion.div>
          )}
        </div>
      </main>

      <footer className="max-w-6xl mx-auto px-4 py-12 text-center text-slate-400 text-sm">
        <p>&copy; 2026 SRM Full Stack Challenge. Built with Express, React & Tailwind.</p>
      </footer>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
    </div>
  );
}
