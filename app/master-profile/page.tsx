"use client";

import { useState, useEffect } from 'react';

interface Bullet {
    original: string;
}

interface Experience {
    role: string;
    company: string;
    bullets: string[];
}

interface Project {
    name: string;
    bullets: string[];
}

export interface MasterProfile {
    summary: string;
    skills: string[];
    experience: Experience[];
    projects: Project[];
    education: string[];
}

const emptyProfile: MasterProfile = {
    summary: "",
    skills: [],
    experience: [],
    projects: [],
    education: []
};

export default function MasterProfilePage() {
    const [profile, setProfile] = useState<MasterProfile | null>(null);
    const [skillInput, setSkillInput] = useState('');
    const [eduInput, setEduInput] = useState('');
    const [savedAction, setSavedAction] = useState(false);

    // Load from LocalStorage
    useEffect(() => {
        const saved = localStorage.getItem('master_profile_data');
        if (saved) {
            try {
                setProfile(JSON.parse(saved));
            } catch (e) {
                setProfile(emptyProfile);
            }
        } else {
            setProfile(emptyProfile);
        }
    }, []);

    // Save to LocalStorage
    const saveProfile = (newProfile: MasterProfile) => {
        setProfile(newProfile);
        localStorage.setItem('master_profile_data', JSON.stringify(newProfile));

        // Quick visual feedback
        setSavedAction(true);
        setTimeout(() => setSavedAction(false), 2000);
    };

    const handleSummaryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (!profile) return;
        saveProfile({ ...profile, summary: e.target.value });
    };

    // --- SKILLS ---
    const addSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && skillInput.trim() && profile) {
            e.preventDefault();
            if (!profile.skills.includes(skillInput.trim())) {
                saveProfile({ ...profile, skills: [...profile.skills, skillInput.trim()] });
            }
            setSkillInput('');
        }
    };

    const removeSkill = (skillToRemove: string) => {
        if (!profile) return;
        saveProfile({
            ...profile,
            skills: profile.skills.filter(s => s !== skillToRemove)
        });
    };

    // --- EXPERIENCE ---
    const addExperience = () => {
        if (!profile) return;
        saveProfile({
            ...profile,
            experience: [...profile.experience, { role: '', company: '', bullets: [] }]
        });
    };

    const updateExperience = (index: number, field: keyof Experience, value: string) => {
        if (!profile) return;
        const newExp = [...profile.experience];
        newExp[index] = { ...newExp[index], [field]: value };
        saveProfile({ ...profile, experience: newExp });
    };

    const removeExperience = (index: number) => {
        if (!profile) return;
        const newExp = [...profile.experience];
        newExp.splice(index, 1);
        saveProfile({ ...profile, experience: newExp });
    };

    const addExperienceBullet = (expIndex: number) => {
        if (!profile) return;
        const newExp = [...profile.experience];
        newExp[expIndex].bullets.push('');
        saveProfile({ ...profile, experience: newExp });
    };

    const updateExperienceBullet = (expIndex: number, bulletIndex: number, value: string) => {
        if (!profile) return;
        const newExp = [...profile.experience];
        newExp[expIndex].bullets[bulletIndex] = value;
        saveProfile({ ...profile, experience: newExp });
    };

    const removeExperienceBullet = (expIndex: number, bulletIndex: number) => {
        if (!profile) return;
        const newExp = [...profile.experience];
        newExp[expIndex].bullets.splice(bulletIndex, 1);
        saveProfile({ ...profile, experience: newExp });
    };

    // --- PROJECTS ---
    const addProject = () => {
        if (!profile) return;
        saveProfile({
            ...profile,
            projects: [...profile.projects, { name: '', bullets: [] }]
        });
    };

    const updateProjectName = (index: number, name: string) => {
        if (!profile) return;
        const newProj = [...profile.projects];
        newProj[index].name = name;
        saveProfile({ ...profile, projects: newProj });
    };

    const removeProject = (index: number) => {
        if (!profile) return;
        const newProj = [...profile.projects];
        newProj.splice(index, 1);
        saveProfile({ ...profile, projects: newProj });
    };

    const addProjectBullet = (projIndex: number) => {
        if (!profile) return;
        const newProj = [...profile.projects];
        newProj[projIndex].bullets.push('');
        saveProfile({ ...profile, projects: newProj });
    };

    const updateProjectBullet = (projIndex: number, bulletIndex: number, value: string) => {
        if (!profile) return;
        const newProj = [...profile.projects];
        newProj[projIndex].bullets[bulletIndex] = value;
        saveProfile({ ...profile, projects: newProj });
    };

    const removeProjectBullet = (projIndex: number, bulletIndex: number) => {
        if (!profile) return;
        const newProj = [...profile.projects];
        newProj[projIndex].bullets.splice(bulletIndex, 1);
        saveProfile({ ...profile, projects: newProj });
    };

    // --- EDUCATION ---
    const addEducation = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && eduInput.trim() && profile) {
            e.preventDefault();
            saveProfile({ ...profile, education: [...profile.education, eduInput.trim()] });
            setEduInput('');
        }
    };

    const removeEducation = (index: number) => {
        if (!profile) return;
        const newEdu = [...profile.education];
        newEdu.splice(index, 1);
        saveProfile({ ...profile, education: newEdu });
    };

    if (!profile) return <div className="p-12 text-center text-neutral-500">Loading profile...</div>;

    return (
        <main className="min-h-screen bg-neutral-50 p-6 md:p-12 font-sans text-neutral-900 pb-32">
            <div className="max-w-4xl mx-auto space-y-8">

                <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div className="space-y-2">
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-900">
                            Master Profile
                        </h1>
                        <p className="text-neutral-500 max-w-xl">
                            Build your source of truth. All your skills, experiences, and projects in one place. We use this to auto-generate perfectly tailored resumes.
                        </p>
                    </div>
                    <div className="flex-shrink-0">
                        <span className={`text-sm font-medium px-3 py-1.5 rounded-full transition-all duration-300 ${savedAction ? 'bg-green-100 text-green-700 opacity-100' : 'bg-neutral-100 text-neutral-400 opacity-50'}`}>
                            {savedAction ? '✓ Auto-saved' : 'Auto-saving enabled'}
                        </span>
                    </div>
                </header>

                <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-6 md:p-8 space-y-10">

                    {/* Summary Section */}
                    <section className="space-y-3">
                        <h2 className="text-xl font-bold text-neutral-800 border-b pb-2">Professional Summary</h2>
                        <textarea
                            rows={4}
                            value={profile.summary}
                            onChange={handleSummaryChange}
                            placeholder="A brief overview of your professional background..."
                            className="w-full rounded-xl border-neutral-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-4 border bg-neutral-50 hover:bg-white transition-colors"
                        />
                    </section>

                    {/* Skills Section */}
                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-neutral-800 border-b pb-2">Skills</h2>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {profile.skills.map(skill => (
                                <span key={skill} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 group">
                                    {skill}
                                    <button onClick={() => removeSkill(skill)} className="hover:text-red-500 focus:outline-none opacity-50 hover:opacity-100 transition-opacity">
                                        &times;
                                    </button>
                                </span>
                            ))}
                        </div>
                        <input
                            type="text"
                            value={skillInput}
                            onChange={e => setSkillInput(e.target.value)}
                            onKeyDown={addSkill}
                            placeholder="Type a skill and press Enter to add..."
                            className="w-full sm:w-96 rounded-lg border-neutral-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border bg-neutral-50"
                        />
                    </section>

                    {/* Experience Section */}
                    <section className="space-y-6">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h2 className="text-xl font-bold text-neutral-800">Experience</h2>
                            <button onClick={addExperience} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 px-3 py-1 rounded-md">
                                + Add Role
                            </button>
                        </div>

                        <div className="space-y-6">
                            {profile.experience.map((exp, expIdx) => (
                                <div key={expIdx} className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 relative group">
                                    <button onClick={() => removeExperience(expIdx)} className="absolute top-4 right-4 text-neutral-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Job Title / Role</label>
                                            <input type="text" value={exp.role} onChange={e => updateExperience(expIdx, 'role', e.target.value)} placeholder="e.g. Senior Software Engineer" className="w-full rounded-md border-neutral-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Company</label>
                                            <input type="text" value={exp.company} onChange={e => updateExperience(expIdx, 'company', e.target.value)} placeholder="e.g. Acme Corp" className="w-full rounded-md border-neutral-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Accomplishments / Responsibilities &nbsp; <span className="text-neutral-400 normal-case font-normal">(AI will pick the most relevant ones)</span></label>
                                        {exp.bullets.map((bullet, bltIdx) => (
                                            <div key={bltIdx} className="flex gap-2">
                                                <textarea rows={2} value={bullet} onChange={e => updateExperienceBullet(expIdx, bltIdx, e.target.value)} className="w-full rounded-md border-neutral-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" placeholder="Bullet point describing what you did..." />
                                                <button onClick={() => removeExperienceBullet(expIdx, bltIdx)} className="text-neutral-300 hover:text-red-500 px-2">&times;</button>
                                            </div>
                                        ))}
                                        <button onClick={() => addExperienceBullet(expIdx)} className="text-xs text-indigo-600 hover:underline font-medium mt-1 inline-block">
                                            + Add Bullet
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {profile.experience.length === 0 && <p className="text-sm text-neutral-400 italic">No experience added yet.</p>}
                        </div>
                    </section>

                    {/* Projects Section */}
                    <section className="space-y-6">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h2 className="text-xl font-bold text-neutral-800">Projects</h2>
                            <button onClick={addProject} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 px-3 py-1 rounded-md">
                                + Add Project
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            {profile.projects.map((proj, projIdx) => (
                                <div key={projIdx} className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 relative group">
                                    <button onClick={() => removeProject(projIdx)} className="absolute top-4 right-4 text-neutral-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>

                                    <div className="mb-4">
                                        <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Project Name</label>
                                        <input type="text" value={proj.name} onChange={e => updateProjectName(projIdx, e.target.value)} placeholder="e.g. Machine Learning Pipeline Dashboard" className="w-full rounded-md border-neutral-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border" />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Details</label>
                                        {proj.bullets.map((bullet, bltIdx) => (
                                            <div key={bltIdx} className="flex gap-2">
                                                <input type="text" value={bullet} onChange={e => updateProjectBullet(projIdx, bltIdx, e.target.value)} className="w-full rounded-md border-neutral-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" placeholder="Detail or feature built..." />
                                                <button onClick={() => removeProjectBullet(projIdx, bltIdx)} className="text-neutral-300 hover:text-red-500 px-2">&times;</button>
                                            </div>
                                        ))}
                                        <button onClick={() => addProjectBullet(projIdx)} className="text-xs text-indigo-600 hover:underline font-medium mt-1 inline-block">
                                            + Add Detail
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {profile.projects.length === 0 && <p className="text-sm text-neutral-400 italic">No projects added yet.</p>}
                        </div>
                    </section>

                    {/* Education Section */}
                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-neutral-800 border-b pb-2">Education</h2>
                        <div className="space-y-2 mb-2">
                            {profile.education.map((edu, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                                    <span className="text-sm text-neutral-800 font-medium">{edu}</span>
                                    <button onClick={() => removeEducation(idx)} className="text-neutral-400 hover:text-red-500 p-1">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                        <input
                            type="text"
                            value={eduInput}
                            onChange={e => setEduInput(e.target.value)}
                            onKeyDown={addEducation}
                            placeholder="e.g. B.S. Computer Science - University of State, 2018 (Press Enter)"
                            className="w-full rounded-lg border-neutral-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border bg-neutral-50"
                        />
                    </section>

                </div>
            </div>
        </main>
    );
}
