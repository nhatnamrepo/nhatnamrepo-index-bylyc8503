import axios from 'axios'
import useSWR, { SWRResponse } from 'swr'
import { Dispatch, Fragment, SetStateAction, useState } from 'react'
import AwesomeDebouncePromise from 'awesome-debounce-promise'
import { useAsync } from 'react-async-hook'
import useConstant from 'use-constant'

import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Dialog, DialogBackdrop, Transition } from '@headlessui/react'

import type { OdDriveItem, OdSearchResult } from '../types'
import { LoadingIcon } from './Loading'

import { getFileIcon } from '../utils/getFileIcon'
import { fetcher } from '../utils/fetchWithSWR'
import siteConfig from '../../config/site.config'

function mapAbsolutePath(path: string): string {
  const absolutePath = path.split(siteConfig.baseDirectory === '/' ? 'root:' : siteConfig.baseDirectory)
  return absolutePath.length > 1
    ? absolutePath[1]
        .split('/')
        .map(p => encodeURIComponent(decodeURIComponent(p)))
        .join('/')
    : ''
}

function useDriveItemSearch() {
  const [query, setQuery] = useState('')
  const searchDriveItem = async (q: string) => {
    const { data } = await axios.get<OdSearchResult>(`/api/search?q=${q}`)
    data.map(item => {
      item['path'] =
        'path' in item.parentReference
          ? `${mapAbsolutePath(item.parentReference.path)}/${encodeURIComponent(item.name)}`
          : ''
    })
    return data
  }

  const debouncedDriveItemSearch = useConstant(() => AwesomeDebouncePromise(searchDriveItem, 1000))
  const results = useAsync(async () => {
    if (query.length === 0) {
      return []
    } else {
      return debouncedDriveItemSearch(query)
    }
  }, [query])

  return {
    query,
    setQuery,
    results,
  }
}

function SearchResultItemTemplate({
  driveItem,
  driveItemPath,
  itemDescription,
  disabled,
}: {
  driveItem: OdSearchResult[number]
  driveItemPath: string
  itemDescription: string
  disabled: boolean
}) {
  return (
    <Link
      href={driveItemPath}
      passHref
      className={`flex items-center space-x-4 border-b border-gray-400/30 px-4 py-1.5 hover:bg-white/10 ${
        disabled ? 'pointer-events-none cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <FontAwesomeIcon icon={driveItem.file ? getFileIcon(driveItem.name) : ['far', 'folder']} />
      <div>
        <div className="text-sm font-medium leading-8">{driveItem.name}</div>
        <div
          className={`overflow-hidden truncate font-mono text-xs opacity-60 ${
            itemDescription === 'Loading ...' && 'animate-pulse'
          }`}
        >
          {itemDescription}
        </div>
      </div>
    </Link>
  )
}

function SearchResultItemLoadRemote({ result }: { result: OdSearchResult[number] }) {
  const { data, error }: SWRResponse<OdDriveItem, { status: number; message: any }> = useSWR(
    [`/api/item?id=${result.id}`],
    fetcher
  )

  if (error) {
    return (
      <SearchResultItemTemplate
        driveItem={result}
        driveItemPath={''}
        itemDescription={typeof error.message?.error === 'string' ? error.message.error : JSON.stringify(error.message)}
        disabled={true}
      />
    )
  }
  if (!data) {
    return (
      <SearchResultItemTemplate driveItem={result} driveItemPath={''} itemDescription={'Loading ...'} disabled={true} />
    )
  }

  const driveItemPath = `${mapAbsolutePath(data.parentReference.path)}/${encodeURIComponent(data.name)}`
  return (
    <SearchResultItemTemplate
      driveItem={result}
      driveItemPath={driveItemPath}
      itemDescription={decodeURIComponent(driveItemPath)}
      disabled={false}
    />
  )
}

function SearchResultItem({ result }: { result: OdSearchResult[number] }) {
  if (result.path === '') {
    return <SearchResultItemLoadRemote result={result} />
  } else {
    const driveItemPath = decodeURIComponent(result.path)
    return (
      <SearchResultItemTemplate
        driveItem={result}
        driveItemPath={result.path}
        itemDescription={driveItemPath}
        disabled={false}
      />
    )
  }
}

export default function SearchModal({
  searchOpen,
  setSearchOpen,
}: {
  searchOpen: boolean
  setSearchOpen: Dispatch<SetStateAction<boolean>>
}) {
  const { query, setQuery, results } = useDriveItemSearch()

  const closeSearchBox = () => {
    setSearchOpen(false)
    setQuery('')
  }

return (
  <Transition appear show={searchOpen} as={Fragment}>
    <Dialog as="div" className="fixed inset-0 z-[200]" onClose={closeSearchBox}>
  <div className="fixed inset-0" onClick={closeSearchBox} />
    <div className="fixed inset-0 overflow-y-auto pointer-events-none">
    <div className="flex min-h-full items-start justify-center p-4 pt-12">
      <Transition.Child
        as="div"
        className="pointer-events-auto mx-auto max-w-3xl w-[calc(100%-2rem)]"
        enter="ease-out duration-100"
        enterFrom="opacity-0 scale-95"
        enterTo="opacity-100 scale-100"
        leave="ease-in duration-100"
        leaveFrom="opacity-100 scale-100"
        leaveTo="opacity-0 scale-95"
      >
      <div className="overflow-hidden rounded border border-gray-300/30 text-left shadow-xl backdrop-blur-lg">
      <Dialog.Title
                as="h3"
                className="flex items-center space-x-4 border-b border-gray-400/30 bg-black/60 p-4 text-white"
              >
                <FontAwesomeIcon icon="search" className="h-4 w-4" />
                <input
                  type="text"
                  id="search-box"
                  className="w-full bg-transparent focus:outline-none focus-visible:outline-none"
                  placeholder={'Search ...'}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
                <div className="rounded-lg bg-gray-200 px-2 py-1 text-xs font-medium dark:bg-gray-700">ESC</div>
              </Dialog.Title>
              <div
                className="max-h-[80vh] overflow-x-hidden overflow-y-scroll bg-black/60 text-white"
                onClick={closeSearchBox}
              >
                {results.loading && (
                  <div className="px-4 py-12 text-center text-sm font-medium">
                    <LoadingIcon className="svg-inline--fa mr-2 inline-block h-4 w-4 animate-spin" />
                    <span>{'Loading ...'}</span>
                  </div>
                )}
                {results.error && (
                  <div className="px-4 py-12 text-center text-sm font-medium">{`Error: ${results.error.message}`}</div>
                )}
                {results.result && (
                  <>
                    {results.result.length === 0 ? (
                      <div className="px-4 py-12 text-center text-sm font-medium">{'Nothing here.'}</div>
                    ) : (
                      results.result.map(result => <SearchResultItem key={result.id} result={result} />)
                    )}
                  </>
                )}
                </div>
              </div>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
