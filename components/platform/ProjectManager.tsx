import { FormEvent, useState } from 'react'

import { useAppState, type ProjectRun } from '@/app/providers/app-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function ProjectManager() {
  const {
    projects,
    activeProjectId,
    createProject,
    setActiveProject,
  } = useAppState()
  const [projectName, setProjectName] = useState('')

  const handleCreate = (event: FormEvent) => {
    event.preventDefault()
    if (!projectName.trim()) return
    createProject(projectName.trim())
    setProjectName('')
  }

  const activeProject = projects.find((project) => project.id === activeProjectId)

  return (
    <div className="space-y-4">
      <form onSubmit={handleCreate} className="flex flex-wrap gap-3">
        <Input
          placeholder="New project name"
          value={projectName}
          onChange={(event) => setProjectName(event.target.value)}
          className="max-w-xs"
        />
        <Button type="submit">Create project</Button>
      </form>

      <div className="flex flex-wrap gap-3">
        {projects.map((project) => (
          <button
            key={project.id}
            onClick={() => setActiveProject(project.id)}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              project.id === activeProjectId
                ? 'border-indigo-500 bg-indigo-50 text-indigo-900 dark:border-indigo-400 dark:bg-indigo-500/10 dark:text-indigo-100'
                : 'border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-800 dark:text-slate-200'
            }`}
          >
            {project.name} ({project.runs.length})
          </button>
        ))}
      </div>

      {activeProject ? (
        <Card>
          <CardHeader>
            <CardTitle>{activeProject.name} runs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeProject.runs.length === 0 && (
              <p className="text-sm text-slate-500">No runs stored for this project yet.</p>
            )}
            {activeProject.runs.map((run: ProjectRun) => (
              <div
                key={run.id}
                className="rounded-xl border border-slate-200 bg-white/70 p-3 text-sm dark:border-slate-800 dark:bg-slate-900/40"
              >
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
                  <span>{new Date(run.createdAt).toLocaleString()}</span>
                  <span>{run.tokenizer}</span>
                </div>
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  {run.totalTokens.toLocaleString()} tokens
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{run.summary}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-slate-500">Select or create a project to view its runs.</p>
      )}
    </div>
  )
}

