"use client"

import React, { useState, useCallback, FC, useEffect, createContext, useContext } from 'react';
import { useDropzone } from 'react-dropzone';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- App Context for Global State ---
type HistoryEntry = {
    type: 'analyze' | 'batch' | 'compare';
    fileName?: string;
    fileNames?: string[];
    date: string;
    [key: string]: any;
};

type AppContextType = {
  files: File[];
  setFiles: (files: File[]) => void;
  currentPage: string;
  setCurrentPage: (page: string) => void;
  tokenizer: string;
  setTokenizer: (tokenizer: string) => void;
  addToHistory: (entry: HistoryEntry) => void;
  history: HistoryEntry[];
  clearHistory: () => void;
};

const AppContext = createContext<AppContextType | null>(null);

const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("useAppContext must be used within an AppProvider");
    return context;
};

// --- Helper & UI Components ---
const Card: FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={`bg-white rounded-lg shadow p-6 ${className || ''}`}>{children}</div>
);

const Button: FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, className, ...props }) => (
    <button
        className={`px-4 py-2 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-700 disabled:bg-gray-400 transition-colors ${className || ''}`}
        {...props}
    >
        {children}
    </button>
);

const Select: FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ children, className, ...props }) => (
    <select
        className={`px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${className || ''}`}
        {...props}
    >
        {children}
    </select>
);

const Input: FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className, ...props }) => (
    <input
        className={`px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${className || ''}`}
        {...props}
    />
);

const TextArea: FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({ className, ...props }) => (
    <textarea
        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${className || ''}`}
        {...props}
    />
);

const Sidebar: FC<{ currentPage: string }> = ({ currentPage }) => {
    const { setCurrentPage } = useAppContext();
    // ADDED "How It Works" and "About" to the nav list
    const navItems = [
        "Upload", 
        "Analyze", 
        "Compare", 
        "Chunking", 
        "Pricing", 
        "API", 
        "Batch", 
        "History", 
        "Learn", 
        "How It Works", // <-- ADDED
        "Settings",
        "About" // <-- ADDED
    ];
    return (
        <div className="w-60 bg-gray-50 p-6 border-r border-gray-200 flex-shrink-0 h-screen sticky top-0 overflow-y-auto">
            <h2 className="text-2xl font-bold text-indigo-600 mb-8">Token Tools</h2>
            <nav>
                <ul className="space-y-2">
                    {navItems.map(item => (
                        <li key={item}>
                            <button
                                onClick={() => setCurrentPage(item.toLowerCase())}
                                className={`w-full text-left px-4 py-2 rounded-lg text-gray-700 font-medium transition-colors ${currentPage === item.toLowerCase() ? 'bg-indigo-600 text-white' : 'hover:bg-indigo-100'}`}
                            >
                                {item}
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>
        </div>
    );
};

const PageTitle: FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
    <>
        <h1 className="text-4xl font-bold mb-2">{title}</h1>
        <p className="text-gray-600 mb-8">{subtitle}</p>
    </>
);

// --- Page Implementations ---

const UploadPage: FC = () => {
    const { setFiles, setCurrentPage } = useAppContext();
    const [error, setError] = useState<string | null>(null);

    const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
        setError(null);
        if (rejectedFiles.length > 0) {
            setError("Some files were rejected. Please upload .txt, .md, or .zip files.");
            return;
        }
        if (acceptedFiles.length > 0) {
            setFiles(acceptedFiles);
            setCurrentPage('analyze');
        }
    }, [setFiles, setCurrentPage]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        // Restore support for ZIP and Markdown
        accept: { 
            'text/plain': ['.txt', '.md'], 
            'application/zip': ['.zip'],
            'application/x-zip-compressed': ['.zip']
        },
        // No max size limit for ZIPs (handled by server)
    });

    return (
        <div>
            <PageTitle title="Upload Files" subtitle="Drag and drop your files to start the analysis." />
            <div {...getRootProps()} className={`p-16 border-3 border-dashed rounded-xl cursor-pointer transition-colors text-center ${isDragActive ? 'border-indigo-700 bg-indigo-50' : 'border-indigo-500 bg-gray-50'}`}>
                <input {...getInputProps()} />
                <p className="text-indigo-700 font-medium">
                    {isDragActive ? 'Drop the files here...' : 'Drag & drop files, or click to select'}
                </p>
                <p className="text-sm text-gray-500 mt-2">Supported: .txt, .md, .zip</p>
            </div>
            {error && <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}
        </div>
    );
};

const AnalyzePage: FC = () => {
    const { files, tokenizer, addToHistory } = useAppContext();
    const [analysis, setAnalysis] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copyLabel, setCopyLabel] = useState("Copy Summary");

    useEffect(() => {
        const analyzeFiles = async () => {
            if (files.length === 0) return;
            
            setIsLoading(true);
            setError(null);
            
            try {
                // Use FormData to support ZIPs and multiple files like the original app
                const formData = new FormData();
                files.forEach((file, i) => {
                    formData.append(`file${i}`, file);
                });
                formData.append('encoding', tokenizer);

                // FIXED: Use relative path. Next.js will proxy this.
                const response = await fetch('/api/count-tokens', {
                    method: 'POST',
                    body: formData, // No Content-Type header needed (browser sets it for FormData)
                });

                if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
                const data = await response.json();
                
                if (data.error) throw new Error(data.error);
                
                // The API returns { files: [...], total_tokens: ... }
                setAnalysis(data);
                
                addToHistory({ 
                    type: 'analyze', 
                    fileNames: files.map(f => f.name),
                    totalTokens: data.total_tokens, 
                    date: new Date().toISOString() 
                });
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        analyzeFiles();
    }, [files, tokenizer, addToHistory]);

    const handleCopy = () => {
        if (!analysis) return;
        const summary = `Total Tokens: ${analysis.total_tokens}\n` + 
                        analysis.files.map((f: any) => `${f.name}: ${f.token_count} tokens`).join('\n');
        navigator.clipboard.writeText(summary);
        setCopyLabel("Copied!");
        setTimeout(() => setCopyLabel("Copy Summary"), 2000);
    };

    if (files.length === 0) return <p>Upload a file on the Upload page to begin analysis.</p>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-4xl font-bold">Analysis Result</h1>
                {analysis && (
                    <Button onClick={handleCopy} className="bg-gray-200 text-gray-800 hover:bg-gray-300">
                        {copyLabel}
                    </Button>
                )}
            </div>

            {isLoading && (
                <div className="p-8 bg-yellow-50 text-yellow-800 rounded-md flex items-center gap-3">
                    <div className="animate-spin h-5 w-5 border-2 border-yellow-800 border-t-transparent rounded-full"></div>
                    Processing files... (This handles ZIP extraction on the server)
                </div>
            )}
            
            {error && <div className="p-4 bg-red-100 text-red-700 rounded-md">{error}</div>}

            {analysis && !isLoading && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <p className="text-gray-500">Total Token Count</p>
                            <p className="text-4xl font-bold text-indigo-600">{analysis.total_tokens?.toLocaleString()}</p>
                        </Card>
                        <Card>
                            <p className="text-gray-500">Estimated Cost (GPT-4 input)</p>
                            <p className="text-4xl font-bold text-green-600">
                                ${(analysis.total_tokens * 0.00003).toFixed(4)}
                            </p>
                        </Card>
                    </div>

                    <Card>
                        <h3 className="font-bold text-lg mb-4">File Details</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b">
                                        <th className="py-2">Filename</th>
                                        <th className="py-2 text-right">Tokens</th>
                                        <th className="py-2 text-right">Words</th>
                                        <th className="py-2 text-right">Chars</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {analysis.files.map((f: any, i: number) => (
                                        <tr key={i} className="border-b last:border-b-0 hover:bg-gray-50">
                                            <td className="py-2">{f.name}</td>
                                            <td className="py-2 text-right font-mono">{f.token_count.toLocaleString()}</td>
                                            <td className="py-2 text-right text-gray-500">{f.words.toLocaleString()}</td>
                                            <td className="py-2 text-right text-gray-500">{f.chars.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

// ADDED
const HowItWorksPage: FC = () => (
    <div className="space-y-6 max-w-3xl">
        <PageTitle title="How it works" subtitle="Under the hood of myTokenTools." />
        <Card>
            <h3 className="font-bold text-lg mb-2">File Processing</h3>
            <p className="text-gray-700 mb-4">
                You can upload <strong>plaintext (.txt, .md)</strong> or <strong>ZIP archives</strong>. 
                When you upload a ZIP file, the server automatically unzips it in memory and processes every text file inside it.
            </p>
            <h3 className="font-bold text-lg mb-2">Tokenization Engine</h3>
            <p className="text-gray-700 mb-4">
                We use the <code>tiktoken</code> library (specifically the <code>cl100k_base</code> encoding) which is identical 
                to the tokenizer used by OpenAI's GPT-3.5 and GPT-4 models. This ensures 100% accuracy for cost estimation.
            </p>
            <h3 className="font-bold text-lg mb-2">Performance</h3>
            <p className="text-gray-700">
                For very large jobs, a production version of this system would enqueue background workers (using Celery/Redis) 
                to process files asynchronously to avoid timeouts.
            </p>
        </Card>
        <div className="text-sm text-gray-500 mt-4">
            © myTokenTools
        </div>
    </div>
);

// ADDED 
const AboutPage: FC = () => (
    <div className="space-y-6 max-w-3xl">
        <PageTitle title="About myTokenTools" subtitle="Simple, secure token counting." />
        <Card>
            <p className="text-gray-700 leading-relaxed">
                myTokenTools helps you estimate token counts for files using the <strong>cl100k_base</strong> tokenizer 
                (the same one used by GPT-4 and GPT-3.5). It is built for quick analysis, pricing estimation, and prototyping.
            </p>
            <p className="text-gray-700 mt-4">
                This project serves as a modern example of a full-stack application using:
            </p>
            <ul className="list-disc list-inside mt-2 text-gray-600 ml-4">
                <li><strong>Next.js 15</strong> for the frontend</li>
                <li><strong>Flask (Python)</strong> for the backend API</li>
                <li><strong>Tiktoken</strong> for accurate tokenization</li>
                <li><strong>Docker</strong> for containerization</li>
            </ul>
        </Card>
        <div className="text-sm text-gray-500 mt-8">
            © myTokenTools — <a href="https://github.com/MediculousCodes/mytokentools" className="text-indigo-600 hover:underline">GitHub</a>
        </div>
    </div>
);


const ComparePage: FC = () => {
    const { files, addToHistory } = useAppContext();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [results, setResults] = useState<Record<string, number | string> | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (files.length > 0) {
            setSelectedFile(files[0]);
        }
    }, [files]);
    
    const runComparison = useCallback(async (file: File) => {
        setIsLoading(true);
        setError(null);
        try {
            const text = await file.text();
            const encodings = ["cl100k_base", "p50k_base", "r50k_base", "gpt2"];
            // FIXED: Use relative path
            const response = await fetch('/compare_tokenizers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, encodings }),
            });
            if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            setResults(data.results);
            addToHistory({
                type: 'compare',
                fileName: file.name,
                results: data.results,
                date: new Date().toISOString(),
            });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [addToHistory]);

    useEffect(() => {
        if (selectedFile) {
            runComparison(selectedFile);
        } else {
            setResults(null);
        }
    }, [selectedFile, runComparison]);

    if (files.length === 0) return <p>Upload a file on the Upload page to compare tokenizers.</p>;

    return (
        <div>
            <div className="flex justify-between items-center">
                <PageTitle title="Compare Tokenizers" subtitle={`Comparing results for ${selectedFile?.name || '...'}`} />
                <Select value={selectedFile?.name || ''} onChange={e => setSelectedFile(files.find(f => f.name === e.target.value) || null)}>
                    <option value="" disabled>Select a file</option>
                    {files.map(file => <option key={file.name} value={file.name}>{file.name}</option>)}
                </Select>
            </div>
            {isLoading && <p>Comparing...</p>}
            {error && <p className="text-red-500">{error}</p>}
            {results && !isLoading && (
                 <Card>
                    <table className="w-full">
                        <thead>
                            <tr className="border-b">
                                <th className="text-left py-2 px-4 font-semibold">Encoding</th>
                                <th className="text-right py-2 px-4 font-semibold">Token Count</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(results).map(([name, count]) => (
                                <tr key={name} className="border-b last:border-b-0 hover:bg-gray-50">
                                    <td className="py-3 px-4 font-mono">{name}</td>
                                    <td className="py-3 px-4 font-mono text-right">{typeof count === 'number' ? count.toLocaleString() : String(count)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            )}
        </div>
    );
};

const ChunkingPage: FC = () => {
    const { files, tokenizer } = useAppContext();
    const [chunkSize, setChunkSize] = useState(200);
    const [overlap, setOverlap] = useState(20);
    const [chunks, setChunks] = useState<string[]>([]);

    useEffect(() => {
        if (files.length > 0) {
            const processFile = async () => {
                const text = await files[0].text();
                const words = text.split(/\s+/);
                const newChunks = [];
                for (let i = 0; i < words.length; i += (chunkSize - overlap)) {
                    const chunk = words.slice(i, i + chunkSize).join(' ');
                    newChunks.push(chunk);
                }
                setChunks(newChunks);
            };
            processFile();
        }
    }, [files, chunkSize, overlap]);
    
    if (files.length === 0) return <p>Upload a file to simulate chunking.</p>;

    return (
        <div>
            <PageTitle title="Chunking Simulator" subtitle={`Visualizing chunks for ${files[0]?.name}`} />
            <Card className="mb-6">
                <div className="flex items-center gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Chunk Size (words)</label>
                        <Input type="number" value={chunkSize} onChange={e => setChunkSize(parseInt(e.target.value))} className="mt-1" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Overlap (words)</label>
                        <Input type="number" value={overlap} onChange={e => setOverlap(parseInt(e.target.value))} className="mt-1" />
                    </div>
                </div>
            </Card>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-4">
                {chunks.map((chunk, i) => (
                    <Card key={i}>
                        <p className="font-bold text-indigo-600 mb-2">Chunk {i + 1}</p>
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">{chunk}</p>
                    </Card>
                ))}
            </div>
        </div>
    );
};

const PricingPage: FC = () => {
    const { files } = useAppContext();
    const [totalTokens, setTotalTokens] = useState(0);
    const [inputCost, setInputCost] = useState(0.50); // GPT-3.5-turbo default
    const [outputCost, setOutputCost] = useState(1.50);
    
    useEffect(() => {
        if (files.length > 0) {
            const getTokenCount = async () => {
                const text = await files[0].text();
                // FIXED: Use relative path
                const response = await fetch('/analyze', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text, encoding: 'cl100k_base' }),
                });
                const data = await response.json();
                setTotalTokens(data.token_count);
            };
            getTokenCount();
        }
    }, [files]);
    
    if (files.length === 0) return <p>Upload a file to estimate costs.</p>;
    const ingestionCost = (totalTokens / 1000000) * inputCost;
    
    return (
        <div>
            <PageTitle title="Pricing Estimator" subtitle={`Estimating costs for ${files[0]?.name}`} />
             <Card className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Input Cost ($ / 1M tokens)</label>
                        <Input type="number" value={inputCost} onChange={e => setInputCost(parseFloat(e.target.value))} step="0.01" className="mt-1" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Output Cost ($ / 1M tokens)</label>
                        <Input type="number" value={outputCost} onChange={e => setOutputCost(parseFloat(e.target.value))} step="0.01" className="mt-1" />
                    </div>
                </div>
            </Card>
            <Card>
                <h3 className="font-bold text-lg mb-4">Cost Summary</h3>
                <p>Total Tokens: <span className="font-mono">{totalTokens.toLocaleString()}</span></p>
                <p className="text-2xl font-bold mt-2">Estimated Ingestion Cost: <span className="text-indigo-600">${ingestionCost.toFixed(4)}</span></p>
            </Card>
        </div>
    );
};

const ApiPage: FC = () => {
    const [text, setText] = useState("Hello world! This is a test.");
    const [response, setResponse] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const callApi = async () => {
        setIsLoading(true);
        // FIXED: Use relative path
        const res = await fetch('/analyze', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, encoding: 'cl100k_base' }),
        });
        const data = await res.json();
        setResponse(data);
        setIsLoading(false);
    };
    
    return (
        <div>
            <PageTitle title="API Playground" subtitle="Test the tokenization endpoint directly." />
            <Card>
                <TextArea value={text} onChange={e => setText(e.target.value)} rows={5} />
                <Button onClick={callApi} disabled={isLoading} className="mt-4">
                    {isLoading ? 'Tokenizing...' : 'Tokenize'}
                </Button>
            </Card>
            {response && (
                <Card className="mt-6">
                    <h3 className="font-bold mb-2">JSON Response</h3>
                    <pre className="bg-gray-800 text-white p-4 rounded-md text-sm overflow-x-auto">
                        {JSON.stringify(response, null, 2)}
                    </pre>
                </Card>
            )}
        </div>
    );
};

const BatchPage: FC = () => {
    const { files, tokenizer, addToHistory } = useAppContext();
    const [results, setResults] = useState<(any | null)[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const runBatch = useCallback(async () => {
        if (files.length === 0) return;
        setIsLoading(true);
        setResults(files.map(() => null)); 

        const texts = await Promise.all(files.map(f => f.text()));
        
        try {
            // FIXED: Use relative path
            const response = await fetch('/batch_tokenize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texts, encoding: tokenizer }),
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            const finalResults = files.map((file, index) => ({
                fileName: file.name,
                status: 'Done',
                ...data.results[index]
            }));

            setResults(finalResults);
            addToHistory({ type: 'batch', fileNames: files.map(f => f.name), results: finalResults, date: new Date().toISOString() });
        } catch (err) {
            setResults(files.map(file => ({ fileName: file.name, status: 'Error' })));
        } finally {
            setIsLoading(false);
        }
    }, [files, tokenizer, addToHistory]);

    if (files.length === 0) return <p>Upload files to start a batch process.</p>;

    return (
        <div>
            <PageTitle title="Batch Processing" subtitle={`Ready to process ${files.length} files.`} />
            <Button onClick={runBatch} disabled={isLoading}>
                {isLoading ? 'Processing...' : `Process ${files.length} Files`}
            </Button>
            
            <Card className="mt-6">
                 <table className="w-full">
                    <thead>
                        <tr className="border-b">
                            <th className="text-left py-2 px-4 font-semibold">Filename</th>
                            <th className="text-left py-2 px-4 font-semibold">Status</th>
                            <th className="text-right py-2 px-4 font-semibold">Token Count</th>
                            <th className="text-right py-2 px-4 font-semibold">Word Count</th>
                        </tr>
                    </thead>
                    <tbody>
                        {files.map((file, index) => (
                            <tr key={file.name} className="border-b last:border-b-0 hover:bg-gray-50">
                                <td className="py-3 px-4">{file.name}</td>
                                <td className="py-3 px-4">{results[index]?.status || 'Pending'}</td>
                                <td className="py-3 px-4 text-right font-mono">{results[index]?.token_count?.toLocaleString() || '-'}</td>
                                <td className="py-3 px-4 text-right font-mono">{results[index]?.word_count?.toLocaleString() || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </div>
    );
};

const HistoryPage: FC = () => {
    const { history, clearHistory } = useAppContext();
    return (
        <div>
            <div className="flex justify-between items-center">
                <PageTitle title="History" subtitle="Your 50 most recent analysis runs." />
                <Button onClick={clearHistory} className="bg-red-600 hover:bg-red-700">Clear History</Button>
            </div>
            <div className="space-y-4">
                {history.length === 0 ? <p>No history yet. Run an analysis to see it here.</p> :
                    history.map((item, i) => (
                        <Card key={i}>
                            <p className="font-bold text-indigo-600">{item.type.toUpperCase()}: {item.fileName || item.fileNames?.join(', ') || 'API Test'}</p>
                            <p className="text-sm text-gray-500">{new Date(item.date).toLocaleString()}</p>
                        </Card>
                    ))
                }
            </div>
        </div>
    );
};

const LearnPage: FC = () => (
    <div className="space-y-6 max-w-3xl">
        <PageTitle title="Learn About Tokenization" subtitle="Key concepts for understanding LLMs." />
        <Card>
            <h3 className="font-bold text-lg mb-2">What is a Token?</h3>
            <p className="text-gray-700">
                A token is a piece of text that a language model processes. It can be a word, part of a word (like "ing"), or a single character. Models break down text into these tokens to understand and generate language. For English, a rough guide is that 100 tokens is about 75 words.
            </p>
        </Card>
        <Card>
            <h3 className="font-bold text-lg mb-2">Context Window</h3>
            <p className="text-gray-700">
                The context window is the maximum number of tokens a model can process at once. This includes both your input (prompt) and the model's output (response). For example, GPT-3.5-turbo has a context window of 4,096 tokens. If your input and the desired output exceed this, the request will fail.
            </p>
        </Card>
    </div>
);

const SettingsPage: FC = () => {
    const { tokenizer, setTokenizer, clearHistory } = useAppContext();
    return (
        <div>
            <PageTitle title="Settings" subtitle="Configure your token analysis preferences." />
            <Card className="max-w-md space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Default Tokenizer</label>
                    <Select value={tokenizer} onChange={e => setTokenizer(e.target.value)} className="w-full">
                        <option value="cl100k_base">cl100k_base (GPT-4, GPT-3.5)</option>
                        <option value="p50k_base">p50k_base (Codex models)</option>
                        <option value="r50k_base">r50k_base (GPT-3)</option>
                        <option value="gpt2">gpt2 (GPT-2)</option>
                    </Select>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Retention</label>
                    <p className="text-sm text-gray-500 mb-3">
                        Auto-delete uploaded files after 24 hours (server-side). 
                        Local history is stored in your browser.
                    </p>
                    <Button onClick={clearHistory} className="bg-red-600 hover:bg-red-700 w-full">
                        Clear Local History
                    </Button>
                </div>
            </Card>
        </div>
    );
};

// --- Main App Component ---
const App: FC = () => {
    const [currentPage, setCurrentPage] = useState('upload');
    const [files, setFiles] = useState<File[]>([]);
    const [tokenizer, setTokenizer] = useState('cl100k_base');
    const [history, setHistory] = useState<HistoryEntry[]>(() => {
        if (typeof window === 'undefined') return [];
        const saved = localStorage.getItem('token_history_v2');
        return saved ? JSON.parse(saved) : [];
    });

    const addToHistory = useCallback((entry: HistoryEntry) => {
        setHistory(prevHistory => {
            const newHistory = [entry, ...prevHistory].slice(0, 50);
            localStorage.setItem('token_history_v2', JSON.stringify(newHistory));
            return newHistory;
        });
    }, []);
    
    const clearHistory = useCallback(() => {
        setHistory([]);
        localStorage.removeItem('token_history_v2');
    }, []);

    const renderPage = () => {
        switch (currentPage) {
            case 'upload': return <UploadPage />;
            case 'analyze': return <AnalyzePage />;
            case 'compare': return <ComparePage />;
            case 'chunking': return <ChunkingPage />;
            case 'pricing': return <PricingPage />;
            case 'api': return <ApiPage />;
            case 'batch': return <BatchPage />;
            case 'history': return <HistoryPage />;
            case 'learn': return <LearnPage />;
            case 'how it works': return <HowItWorksPage />; // <-- ADDED
            case 'settings': return <SettingsPage />;
            case 'about': return <AboutPage />; // <-- ADDED
            default: return <UploadPage />;
        }
    };
    
    const contextValue: AppContextType = { 
        files, setFiles, currentPage, setCurrentPage, 
        tokenizer, setTokenizer, history, addToHistory, clearHistory 
    };

    return (
        <AppContext.Provider value={contextValue}>
            <div className="flex min-h-screen bg-gray-100 font-sans">
                <Sidebar currentPage={currentPage} />
                <main className="flex-1 p-8 overflow-y-auto">
                    {renderPage()}
                </main>
            </div>
        </AppContext.Provider>
    );
};

export default App;