import React, { useState, useEffect } from 'react';
import { Brain, Zap, Target, Users, ArrowRight, ChevronDown, Play, MessageSquare, FileText, CheckSquare, Palette, Atom, Activity, Network, ChevronLeft, ChevronRight, Beaker, Microscope, Dna, Bot, Sparkles, FlaskConical, TestTube, Cpu, Database, Search, Eye, Lightbulb, Rocket, Heart, Mail } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { AuthPage } from './components/AuthPage';
import { Dashboard } from './components/Dashboard';
import { BoltBadge } from './components/BoltBadge';
import { VideoCallProvider } from './components/VideoCallProvider';

function App() {
  // ALL HOOKS MUST BE CALLED AT THE TOP, BEFORE ANY CONDITIONAL LOGIC
  const [isScrolled, setIsScrolled] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0);
  const { user, loading } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Hide auth page when user becomes authenticated
  useEffect(() => {
    if (user && showAuth) {
      setShowAuth(false);
    }
  }, [user, showAuth]);

  // Auto-scroll features
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeatureIndex((prev) => (prev + 1) % researchFeatures.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleGetStarted = () => {
    if (user) {
      return;
    } else {
      setShowAuth(true);
    }
  };

  const scrollToValueProposition = () => {
    const element = document.getElementById('value-proposition');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const researchFeatures = [
    {
      icon: Beaker,
      title: "Medicinal Compound Generation",
      description: "MedMint uses TamGen which is trained on 120 million bio active compounds to generate real medicinal compounds that can be used to create real medicines",
      color: "from-green-500 to-emerald-600"
    },
    {
      icon: Dna,
      title: "Amino Acid Sequence",
      description: "MedMint finds the amino acid sequence from proteins and shows them in an arranged manner making it easier for researchers to comprehend",
      color: "from-blue-500 to-cyan-600"
    },
    {
      icon: Activity,
      title: "ADME Profiling",
      description: "MedMint creates ADME profile for compounds to predict absorption, distribution, metabolism, and excretion properties",
      color: "from-orange-500 to-red-600"
    },
    {
      icon: Target,
      title: "Target Prediction",
      description: "MedMint can predict the target probability for compounds on proteins with high accuracy and confidence",
      color: "from-purple-500 to-pink-600"
    },
    {
      icon: Zap,
      title: "Binding Affinity Predictor",
      description: "MedMint can find binding affinity between protein and compound to predict drug effectiveness",
      color: "from-indigo-500 to-purple-600"
    },
    {
      icon: Atom,
      title: "Structure Studio",
      description: "Helps visualize the protein and compound in 3D and find distance between atoms for structural analysis",
      color: "from-teal-500 to-cyan-600"
    },
    {
      icon: Bot,
      title: "Neo AI",
      description: "Neo AI weaves the results from these tools and works as an AI assistant that answers researchers' queries with proper citations from credible sources",
      color: "from-pink-500 to-rose-600"
    }
  ];

  const collaborationTools = [
    {
      icon: MessageSquare,
      title: "Realtime Messages",
      description: "Every lab has its own realtime chat to stay connected with team members instantly",
      color: "from-blue-500 to-cyan-600"
    },
    {
      icon: Palette,
      title: "Collaborative Whiteboard",
      description: "Each lab has its own real-time collaborative whiteboard where flowcharts, diagrams, and ideas can be made",
      color: "from-purple-500 to-pink-600"
    },
    {
      icon: FileText,
      title: "Reports",
      description: "Each member of the lab can add reports that can be downloaded by other members at any instance, no more headaches of mailing",
      color: "from-green-500 to-emerald-600"
    },
    {
      icon: CheckSquare,
      title: "Tasks",
      description: "Multiple tasks can be assigned to others or themselves which can be marked done or doing, keeping research on track",
      color: "from-orange-500 to-red-600"
    }
  ];

  const nextFeature = () => {
    setCurrentFeatureIndex((prev) => (prev + 1) % researchFeatures.length);
  };

  const prevFeature = () => {
    setCurrentFeatureIndex((prev) => (prev - 1 + researchFeatures.length) % researchFeatures.length);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="fixed top-[65px] md:top-[90px] right-2 md:right-24 z-50">
        <BoltBadge />
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Show dashboard if user is logged in (and not showing auth)
  if (user && !showAuth) {
    return (
      <VideoCallProvider>
        <Dashboard />
      </VideoCallProvider>
    );
  }

  // Show auth page if requested
  if (showAuth) {
    return <AuthPage onBack={() => setShowAuth(false)} />;
  }

  // Show landing page
  return (
    <div className="bg-[#0F0F0F] text-white min-h-screen">
      <div className="fixed top-2 right-4 z-[9999]">
        <BoltBadge />
      </div>
      
      {/* Header */}
      <header 
        className={`fixed top-0 w-full z-50 h-[65px] transition-all duration-300 ${
          isScrolled 
            ? 'bg-[#0F0F0F] backdrop-blur-md border-b border-gray-800' 
            : 'bg-transparent'
        }`}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img 
              src="/medmint-removebg-preview.png" 
              alt="MedMint" 
              className="w-8 h-8 object-contain"
            />
            <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              MedMint
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section id="home" className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F0F0F] via-[#1a1a1a] to-[#0F0F0F]"></div>
        
        {/* Background gradient blurs */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full filter blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full filter blur-[100px] animate-pulse animation-delay-1000"></div>
        </div>

        {/* Animated scientific elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-16 left-4 sm:left-8 opacity-25 animate-float-slow">
            <svg width="100" height="100" viewBox="0 0 140 140" className="text-blue-400 sm:w-[140px] sm:h-[140px]">
              <g fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="35" cy="35" r="10" className="animate-pulse" />
                <circle cx="70" cy="25" r="8" className="animate-pulse animation-delay-500" />
                <circle cx="105" cy="45" r="9" className="animate-pulse animation-delay-1000" />
                <path d="M35 35 L70 25 L105 45" className="opacity-60" />
              </g>
            </svg>
          </div>

          <div className="absolute top-20 right-4 sm:right-12 opacity-22 animate-float-reverse">
            <svg width="80" height="80" viewBox="0 0 120 120" className="text-purple-400 sm:w-[120px] sm:h-[120px]">
              <g fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="30" cy="30" r="8" className="animate-pulse animation-delay-3000" />
                <circle cx="90" cy="30" r="10" className="animate-pulse animation-delay-3500" />
                <circle cx="60" cy="60" r="9" className="animate-pulse animation-delay-4000" />
                <path d="M30 30 L90 30 L60 60" className="opacity-50" />
              </g>
            </svg>
          </div>

          <div className="absolute bottom-24 left-4 sm:left-16 opacity-28 animate-float-slow animation-delay-2000">
            <svg width="80" height="80" viewBox="0 0 100 100" className="text-green-400 sm:w-[100px] sm:h-[100px]">
              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-40" />
              <circle cx="50" cy="50" r="28" fill="none" stroke="currentColor" strokeWidth="1.2" className="opacity-60" />
              <circle cx="50" cy="50" r="12" fill="currentColor" className="opacity-70 animate-pulse" />
            </svg>
          </div>
        </div>

        <div className="absolute inset-0 bg-gradient-to-r from-[#0F0F0F]/60 via-transparent to-[#0F0F0F]/60"></div>
        
        <div className="relative z-10 text-center max-w-4xl mx-auto px-4 sm:px-6">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              A New Era Begins
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
               For Medical Innovation
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl md:text-2xl text-gray-300 mb-12 leading-relaxed max-w-2xl mx-auto">
            MedMint helps researchers simulate, generate, and validate drug candidates faster — combining AI, chemistry, biology and collaboration in one unified workspace.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center">
            <button 
              onClick={handleGetStarted}
              className="group bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25"
            >
              <span className="flex items-center justify-center gap-2">
                Get Started
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </span>
            </button>
            
            <button 
              onClick={scrollToValueProposition}
              className="group border-2 border-gray-600 hover:border-white text-gray-300 hover:text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold transition-all duration-300 transform hover:scale-105"
            >
              Know More
            </button>
          </div>
        </div>
      </section>

      {/* Value Proposition Section */}
      <section id="value-proposition" className="py-16 sm:py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Graphic - Left side on desktop */}
            <div className="order-2 lg:order-1 flex justify-center">
              <div className="relative">
                <div className="w-72 h-72 sm:w-96 sm:h-96 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center">
                  <div className="w-60 h-60 sm:w-80 sm:h-80 bg-gradient-to-br from-blue-600/30 to-purple-600/30 rounded-full flex items-center justify-center animate-pulse">
                    <div className="w-48 h-48 sm:w-64 sm:h-64 bg-gradient-to-br from-blue-700/40 to-purple-700/40 rounded-full flex items-center justify-center">
                      <div className="relative">
                        <FlaskConical className="w-16 h-16 sm:w-24 sm:h-24 text-blue-400 animate-float-slow" />
                        <Sparkles className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-6 h-6 sm:w-8 sm:h-8 text-purple-400 animate-pulse" />
                        <TestTube className="absolute -bottom-2 -left-2 sm:-bottom-4 sm:-left-4 w-8 h-8 sm:w-12 sm:h-12 text-green-400 animate-float-reverse" />
                      </div>
                    </div>
                  </div>
                </div>
                {/* Floating elements around the main graphic */}
                <div className="absolute -top-4 -right-4 sm:-top-8 sm:-right-8 w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-pink-500/30 to-red-500/30 rounded-full flex items-center justify-center animate-float-particle">
                  <Dna className="w-6 h-6 sm:w-8 sm:h-8 text-pink-400" />
                </div>
                <div className="absolute -bottom-4 -left-4 sm:-bottom-8 sm:-left-8 w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-green-500/30 to-teal-500/30 rounded-full flex items-center justify-center animate-float-particle animation-delay-2000">
                  <Atom className="w-8 h-8 sm:w-10 sm:h-10 text-green-400" />
                </div>
              </div>
            </div>

            {/* Text Content - Right side on desktop */}
            <div className="order-1 lg:order-2">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 sm:mb-8 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Accelerate drug discoveries that save lives.
              </h2>
              <div className="text-lg sm:text-xl text-gray-300 leading-relaxed space-y-4 sm:space-y-6">
                <p>
                  Built for researchers, by innovators — our AI-powered lab reimagines drug discovery as a seamless, collaborative experience. From generating medicinal compounds to visualizing 3D structures, decoding protein sequences, predicting targets, predicting compound protein targets, ADME Profiling and managing research in real-time — everything you need to fight disease and push science forward lives in one intelligent workspace.
                </p>
                <p className="text-xl sm:text-2xl font-semibold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                  Because behind every discovery is a patient waiting for hope.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Research Features Section */}
      <section className="py-16 sm:py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Research Features
            </h2>
            <p className="text-lg sm:text-xl text-gray-400 max-w-4xl mx-auto leading-relaxed">
              An AI research suite that can speed up early drug discovery potentially by 5 years, because reducing years off research could mean increasing years to someone's life.
            </p>
          </div>

          {/* Fixed Feature Cards Carousel */}
          <div className="relative max-w-4xl mx-auto">
            <div className="overflow-hidden">
              <div className="flex justify-center px-4 sm:px-0">
                {/* Single Card Display */}
                <div className="w-full max-w-sm sm:max-w-md">
                  {(() => {
                    const feature = researchFeatures[currentFeatureIndex];
                    const Icon = feature.icon;
                    
                    return (
                      <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-6 sm:p-8 h-80 flex flex-col transition-all duration-700 ease-in-out border-gray-600 shadow-2xl">
                        <div className={`bg-gradient-to-r ${feature.color} w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center mb-4 sm:mb-6 transition-transform duration-300 scale-110`}>
                          <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                        </div>
                        
                        <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-white">
                          {feature.title}
                        </h3>
                        
                        <p className="text-sm sm:text-base text-gray-400 leading-relaxed flex-1">
                          {feature.description}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Navigation Buttons - Positioned outside the card on mobile */}
            <button
              onClick={prevFeature}
              className="absolute left-0 sm:left-4 top-1/2 transform -translate-y-1/2 p-2 sm:p-3 bg-gray-800 hover:bg-gray-700 text-white rounded-full transition-all duration-300 hover:scale-110 shadow-lg z-10"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <button
              onClick={nextFeature}
              className="absolute right-0 sm:right-4 top-1/2 transform -translate-y-1/2 p-2 sm:p-3 bg-gray-800 hover:bg-gray-700 text-white rounded-full transition-all duration-300 hover:scale-110 shadow-lg z-10"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Dots Indicator */}
            <div className="flex justify-center mt-6 sm:mt-8 gap-2">
              {researchFeatures.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentFeatureIndex(index)}
                  className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ${
                    index === currentFeatureIndex 
                      ? 'bg-blue-500 scale-125' 
                      : 'bg-gray-600 hover:bg-gray-500'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Written Space Section */}
      <section className="py-16 sm:py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Text Content - Left side on desktop */}
            <div className="order-1">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 sm:mb-8 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Research shouldn't be slowed down by scattered tools and siloed data.
              </h2>
              <div className="text-lg sm:text-xl text-gray-300 leading-relaxed space-y-4 sm:space-y-6">
                <p>
                  MedMint unifies everything a researcher needs — from molecular generation to structural insights, AI-powered reasoning and collaboration — in a single, intuitive lab interface.
                </p>
                <p>
                  A lab that thinks, assists, and visualizes — built for researchers who can't afford to wait. Everything you need to accelerate discovery, right where you need it.
                </p>
              </div>
            </div>

            {/* Graphic - Right side on desktop */}
            <div className="order-2 flex justify-center">
              <div className="relative">
                <div className="w-72 h-72 sm:w-96 sm:h-96 bg-gradient-to-br from-green-500/20 to-teal-500/20 rounded-2xl flex items-center justify-center transform rotate-3">
                  <div className="w-60 h-60 sm:w-80 sm:h-80 bg-gradient-to-br from-green-600/30 to-teal-600/30 rounded-2xl flex items-center justify-center transform -rotate-6">
                    <div className="w-48 h-48 sm:w-64 sm:h-64 bg-gradient-to-br from-green-700/40 to-teal-700/40 rounded-2xl flex items-center justify-center transform rotate-3">
                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-500/50 rounded-lg flex items-center justify-center">
                          <Database className="w-6 h-6 sm:w-8 sm:h-8 text-blue-300" />
                        </div>
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-purple-500/50 rounded-lg flex items-center justify-center">
                          <Cpu className="w-6 h-6 sm:w-8 sm:h-8 text-purple-300" />
                        </div>
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-500/50 rounded-lg flex items-center justify-center">
                          <Search className="w-6 h-6 sm:w-8 sm:h-8 text-green-300" />
                        </div>
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-orange-500/50 rounded-lg flex items-center justify-center">
                          <Eye className="w-6 h-6 sm:w-8 sm:h-8 text-orange-300" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Connecting lines */}
                <div className="absolute inset-0 pointer-events-none">
                  <svg className="w-full h-full" viewBox="0 0 400 400">
                    <path d="M100 200 Q200 100 300 200" stroke="rgba(34, 197, 94, 0.3)" strokeWidth="2" fill="none" className="animate-pulse" />
                    <path d="M200 100 Q300 200 200 300" stroke="rgba(34, 197, 94, 0.3)" strokeWidth="2" fill="none" className="animate-pulse animation-delay-1000" />
                    <path d="M300 200 Q200 300 100 200" stroke="rgba(34, 197, 94, 0.3)" strokeWidth="2" fill="none" className="animate-pulse animation-delay-2000" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Collaboration Tools Section */}
      <section className="py-16 sm:py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Collaborate like you're in the same lab — even when you're not
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {collaborationTools.map((tool, index) => {
              const Icon = tool.icon;
              return (
                <div
                  key={index}
                  className="group bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-6 sm:p-8 hover:border-gray-600 transition-all duration-300 hover:transform hover:-translate-y-2 hover:shadow-2xl"
                >
                  <div className={`bg-gradient-to-r ${tool.color} w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  </div>
                  
                  <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-white group-hover:text-blue-400 transition-colors duration-300">
                    {tool.title}
                  </h3>
                  
                  <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
                    {tool.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Explanation Section */}
      <section className="py-16 sm:py-24 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 sm:mb-8 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              How Are Medicinal Compounds Generated?
            </h2>
          </div>

          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-3xl p-8 sm:p-12 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full filter blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 sm:w-48 sm:h-48 bg-gradient-to-br from-green-500/10 to-teal-500/10 rounded-full filter blur-3xl"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-center mb-6 sm:mb-8">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center">
                  <FlaskConical className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
              </div>

              <div className="text-lg sm:text-xl text-gray-300 leading-relaxed space-y-4 sm:space-y-6">
                <p>
                  At the heart of generation, <span className="text-blue-400 font-semibold">TamGen</span> is used, it is not just generating molecules — it's reshaping how we begin the search for life-saving medicines. It is designed to create molecules that are purpose-driven, not random.
                </p>
                <p>
                  It understands what a target looks like and generates compounds that are more likely to work with it — which means researchers can skip the guesswork and move faster. Trained on millions of real, active compounds, it brings the wisdom of proven chemistry into every suggestion.
                </p>
                <p>
                  What once took months in a traditional lab can now happen in minutes — dramatically accelerating early drug discovery. In tests, some of its molecules have shown striking similarity to existing drugs, proving that this isn't just theory — it's a real tool, ready to make a real difference.
                </p>
              </div>

              {/* Visual elements */}
              <div className="flex justify-center mt-8 sm:mt-12 gap-6 sm:gap-8">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                    <Lightbulb className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                  </div>
                  <div className="text-xs sm:text-sm text-gray-400">Purpose-Driven</div>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                    <Rocket className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                  </div>
                  <div className="text-xs sm:text-sm text-gray-400">Accelerated</div>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                    <Brain className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                  </div>
                  <div className="text-xs sm:text-sm text-gray-400">AI-Powered</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Impact + CTA Section */}
      <section className="py-16 sm:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20"></div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="mb-8 sm:mb-12">
            <div className="flex justify-center mb-6 sm:mb-8">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Heart className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
              </div>
            </div>
            
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 sm:mb-8 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Built to Accelerate Discovery, Built to Save Lives
            </h2>
            
            <div className="text-lg sm:text-xl text-gray-300 leading-relaxed space-y-3 sm:space-y-4 max-w-3xl mx-auto">
              <p>Behind every compound is a possibility.</p>
              <p>Behind every possibility, a life that could be changed.</p>
              <p>MedMint is more than a tool — it's a platform for progress, built to give scientists what they need most: time, clarity, and collaboration.</p>
            </div>
          </div>
          
          <button 
            onClick={handleGetStarted}
            className="group bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white px-8 sm:px-12 py-3 sm:py-4 rounded-full font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25"
          >
            <span className="flex items-center justify-center gap-2">
              Get Started
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
            </span>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="border-t border-gray-800 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-4 gap-6 sm:gap-8 mb-8 sm:mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <img 
                  src="/medmint-removebg-preview.png" 
                  alt="MedMint" 
                  className="w-8 h-8 object-contain"
                />
                <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  MedMint
                </h3>
              </div>
              <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
                Medicinal & Molecular INtelligence Toolkit, Advancing medical research through artificial intelligence innovation.
              </p>
            </div>
            
            {/* Contact Section */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Contact</h3>
              <div className="flex items-center gap-2 text-gray-400 hover:text-gray-300 transition-colors duration-300">
                <Mail className="w-5 h-5" />
                <a href="mailto:contact@medmint.xyz" className="text-sm sm:text-base">
                  contact@medmint.xyz
                </a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-6 sm:pt-8 text-center text-gray-400">
            <p className="text-sm sm:text-base">&copy; 2025 MedMint. All rights reserved. Advancing healthcare through AI innovation.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;