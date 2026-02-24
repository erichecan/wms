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
                        Aisle Scanner View (Mobile)
                    </Link>
                    <Link href="/admin/layout" className="p-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all font-semibold flex flex-col items-center justify-center gap-2">
                        <span className="text-2xl">💻</span>
                        Layout Builder (PC)
                    </Link>
                </div>
            </div>
        </div>
    );
}
