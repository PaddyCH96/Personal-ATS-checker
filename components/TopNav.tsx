"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApiCost } from '@/components/ApiCostProvider';

const navLinks = [
  { href: '/', label: 'Dashboard' },
  { href: '/master-profile', label: 'Master Profile' },
  { href: '/saved-resumes', label: 'Saved Resumes' },
  { href: '/job-tracker', label: 'Job Tracker' },
];

export default function TopNav() {
    const pathname = usePathname();
    const { totalCost } = useApiCost();

    return (
        <nav className="bg-white border-b border-neutral-200 sticky top-0 z-50">
            <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">

                <Link href="/" className="flex items-center gap-2 group shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-lg group-hover:bg-blue-700 transition-colors">
                        R
                    </div>
                    <span className="font-bold text-neutral-900 tracking-tight hidden sm:inline">
                        Resume<span className="text-blue-600">Matcher</span>
                    </span>
                </Link>

                <div className="flex items-center gap-2 sm:gap-4">
                    {/* API Cost Badge */}
                    <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-semibold tracking-wide shadow-sm" title="Total Running OpenAI API Cost">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        ${totalCost.toFixed(4)}
                    </div>

                    {/* Nav Links */}
                    <div className="flex items-center gap-1">
                        {navLinks.map(link => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`px-2.5 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                                    pathname === link.href
                                        ? 'text-blue-600 bg-blue-50'
                                        : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
                                }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                </div>

            </div>
        </nav>
    );
}
