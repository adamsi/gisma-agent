import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { getUser } from '@/store/slices/authSlice';
import { FileUpload } from '@/components/Upload';
import LoadingSpinner from '@/components/Global/LoadingSpinner';
import ParticlesBackground from '@/components/Global/Particles';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { IconArrowLeft, IconUpload } from '@tabler/icons-react';

const AdminUpload: React.FC = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user, isAdmin, loading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (!user) {
      dispatch(getUser());
    }
  }, [dispatch, user]);

  useEffect(() => {
    if (!loading && user && !isAdmin) {
      router.push('/');
    }
  }, [loading, user, isAdmin, router]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Admin - Document Upload | Gisma Agent</title>
        <meta name="description" content="Admin document upload interface" />
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-950 to-black relative overflow-hidden">
        {/* Particles Background */}
        <div className="absolute inset-0 z-0">
          <ParticlesBackground />
        </div>

        {/* Decorative Background Orbs */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-blue-600/20 blur-3xl" />
          <div className="absolute top-1/3 -right-16 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-cyan-400/10 blur-2xl" />
        </div>

        {/* Subtle Grid Overlay */}
        <div className="absolute inset-0 z-0 bg-grid opacity-30 mask-radial-faded" />
        {/* Header */}
        <div className="relative z-10 bg-black/30 backdrop-blur-xl border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/')}
                  className="p-2 text-blue-200 hover:text-white hover:bg-blue-500/20 rounded-lg transition-all duration-200"
                >
                  <IconArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                    <img
                      src="/sa-logo.png"
                      alt="Gisma Agent Logo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-white">Admin Panel</h1>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-green-300">Admin Access</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-900/30 text-blue-200 text-sm font-medium mb-4 ring-1 ring-white/10 backdrop-blur-sm">
                <IconUpload className="w-4 h-4 mr-2" />
                Document Upload System
              </div>
              <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
                Upload Documents
              </h2>
              <p className="text-lg text-blue-200/70 max-w-xl mx-auto leading-relaxed">
                Files will be processed and indexed for search and analysis.
              </p>
            </div>

            {/* Upload Component */}
            <FileUpload className="w-full" />
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminUpload;
