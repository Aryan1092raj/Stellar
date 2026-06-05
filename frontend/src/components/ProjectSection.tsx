"use client";
import { FormEvent, useState, useEffect } from 'react';
import { z } from 'zod';
import { createProject, listProjects, ProjectItem } from '../lib/api/client';

const projectSchema = z.object({ name: z.string().min(2), ngo_id: z.number(), description: z.string().optional() });

export default function ProjectSection() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [form, setForm] = useState({ name: '', ngo_id: '', description: '' });
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    try { setProjects(await listProjects()); } catch {}
  }
  useEffect(() => { load(); const id = setInterval(load, 15000); return () => clearInterval(id); }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = projectSchema.safeParse({ name: form.name, ngo_id: parseInt(form.ngo_id), description: form.description || undefined });
    if (!parsed.success) { setErrors(parsed.error.issues.map(i => i.message)); return; }
    setErrors([]); setLoading(true);
    try {
      await createProject(parsed.data);
      setForm({ name: '', ngo_id: '', description: '' });
      load();
    } catch { setErrors(['network']); }
    finally { setLoading(false); }
  }

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    <h3>Projects</h3>
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <input placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      <input placeholder="NGO ID" value={form.ngo_id} onChange={e => setForm(f => ({ ...f, ngo_id: e.target.value }))} />
      <input placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      <button disabled={loading}>Create</button>
      {errors.length > 0 && <div style={{ color: 'red', fontSize: 12 }}>{errors.join(', ')}</div>}
    </form>
    <div style={{ maxHeight: 140, overflow: 'auto', border: '1px solid #ddd', padding: 6 }}>
      {projects.length === 0 && <div style={{ fontSize: 12 }}>No projects.</div>}
      {projects.map(p => <div key={p.id} style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between' }}>
        <span>{p.name}</span>
        <span>NGO {p.ngo_id}</span>
      </div>)}
    </div>
  </div>;
}
