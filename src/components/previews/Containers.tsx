import type { ReactElement, ReactNode } from 'react'

export function PreviewContainer({ children }: { children: ReactNode }): ReactElement {
  return <div className="rounded bg-white/50 p-3 shadow-sm backdrop-blur-lg dark:bg-gray-700/50 dark:text-white">{children}</div>
}

export function DownloadBtnContainer({ children }: { children: ReactNode }): ReactElement {
  return (
    <div className="sticky bottom-0 left-0 right-0 z-10 rounded border-t border-gray-900/10 bg-white bg-opacity-80 p-2 shadow-sm backdrop-blur-md dark:border-gray-500/30 dark:bg-gray-900">
      {children}
    </div>
  )
}
