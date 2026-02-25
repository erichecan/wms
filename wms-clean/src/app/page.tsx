import Link from "next/link";

export default function Home() {
    return (
        <div className="p-8 flex items-center justify-center flex-1">
            <div className="glass max-w-2xl w-full p-8 rounded-2xl shadow-xl flex flex-col gap-6 text-center">
                <h2 className="text-3xl font-bold">Welcome to wMS Pro</h2>
                <p className="opacity-80 text-lg">
                    Please select a module to continue.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <Link href="/aisle/K1" className="p-6 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 transition-all font-semibold flex flex-col items-center justify-center gap-2">
                        <span className="text-2xl">📱</span>
                        Default Aisle (K1)
                    </Link>
                    <Link href="/aisle/F33" className="p-6 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 transition-all font-semibold flex flex-col items-center justify-center gap-2">
                        <span className="text-2xl">📦</span>
                        Imported: Aisle F33
                    </Link>
                    <Link href="/aisle/A1" className="p-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all font-semibold flex flex-col items-center justify-center gap-2">
                        <span className="text-2xl">⚡</span>
                        Imported: Aisle A1
                    </Link>
                    <Link href="/admin/layout" className="p-6 rounded-xl border border-slate-500/30 bg-slate-500/10 hover:bg-slate-500/20 transition-all font-semibold flex flex-col items-center justify-center gap-2">
                        <span className="text-2xl">💻</span>
                        Layout Builder
                    </Link>
                </div>
                <div className="mt-6 flex flex-wrap justify-center gap-2 opacity-60 text-sm">
                    <span>Other Areas:</span>
                    {["E11", "V4", "M1", "Y2", "T3"].map(aisle => (
                        <Link key={aisle} href={`/aisle/${aisle}`} className="hover:underline hover:text-indigo-400">
                            {aisle}
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
