/* Yep, another rebased*/
import Head from 'next/head'
import { useRouter } from 'next/router'

import siteConfig from '../../config/site.config'
import Navbar from '../components/Navbar'
import FileListing from '../components/FileListing'
import Footer from '../components/Footer'
import Breadcrumb from '../components/Breadcrumb'
import SwitchLayout from '../components/SwitchLayout'

export default function Folders() {
  const { query } = useRouter()

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center ">
      <Head>
        <title>{siteConfig.title}</title>
      </Head>

      {/* Background Image */}
      <div 
        className="fixed inset-0 -z-10 h-full w-full bg-cover bg-center"
        style={{ backgroundImage: 'url(/images/bg.png)' }}
      />

      <main className="flex w-full flex-1 flex-col bg-black/40">
        <Navbar />
        <div className="mx-auto w-full max-w-5xl py-4 sm:p-4">
          <nav className="mb-4 flex items-center justify-between space-x-3 px-4 sm:px-0 sm:pl-1">
            <Breadcrumb query={query} />
            <SwitchLayout />
          </nav>
          <FileListing query={query} />
        </div>
      </main>

      <Footer />
    </div>
  )
}
