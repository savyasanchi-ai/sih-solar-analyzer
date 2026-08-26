"use client";

import React, { useState, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Sun,
  Zap,
  IndianRupee,
  ShieldCheck,
  MapPin,
  ArrowRight,
  TrendingUp,
  Leaf,
  Layers,
  ChevronRight,
  CheckCircle2,
  Maximize2,
  X,
  BarChart3,
  Building,
  Home,
  Battery,
  Award,
  Calendar,
  ChevronDown,
  ChevronUp,
  Printer,
  FileText,
  UploadCloud,
  FileCheck2,
  Loader2,
  Cpu,
} from "lucide-react";

const RooftopMap = dynamic(() => import("./RooftopMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[480px] rounded-2xl bg-[#1c241f] flex flex-col items-center justify-center text-xs font-mono text-[#d8c29d] gap-2 border border-white/10">
      <span className="h-3 w-3 rounded-full bg-amber-400 animate-ping"></span>
      Initializing High-Resolution Satellite GIS Layer...
    </div>
  ),
});

interface SolutionDetail {
  title: string;
  subtitle: string;
  tag: string;
  desc: string;
  highlights: string[];
  specs: { label: string; value: string }[];
}

interface DiscomInfo {
  name: string;
  tariff: number;
  coords: [number, number];
  solarIrradianceFactor: number[];
}

interface ModuleType {
  id: string;
  name: string;
  ratingWatts: number;
  efficiency: number;
  bifacialGain: number;
  badge: string;
}

const MODULE_OPTIONS: ModuleType[] = [
  {
    id: "poly",
    name: "Standard Polycrystalline",
    ratingWatts: 335,
    efficiency: 17.5,
    bifacialGain: 0,
    badge: "Budget Tier",
  },
  {
    id: "monoperc",
    name: "Mono-PERC Half-Cut",
    ratingWatts: 545,
    efficiency: 21.5,
    bifacialGain: 0,
    badge: "Industry Standard",
  },
  {
    id: "bifacial",
    name: "TOPCon Dual-Glass Bifacial",
    ratingWatts: 580,
    efficiency: 22.8,
    bifacialGain: 0.12, // +12% albedo rear-side generation
    badge: "Maximum Yield",
  },
];

const REGIONAL_DISCOMS: Record<string, DiscomInfo> = {
  "Delhi NCR (BSES / TPDDL)": {
    name: "BSES Rajdhani / Yamuna / TPDDL",
    tariff: 7.8,
    coords: [28.6139, 77.209],
    solarIrradianceFactor: [0.72, 0.85, 1.05, 1.15, 1.2, 1.05, 0.82, 0.78, 0.92, 1.0, 0.82, 0.65],
  },
  "Uttar Pradesh (UPPCL / PVVNL)": {
    name: "Paschimanchal Vidyut Vitran Nigam",
    tariff: 7.5,
    coords: [28.4744, 77.504],
    solarIrradianceFactor: [0.7, 0.82, 1.02, 1.14, 1.18, 1.02, 0.8, 0.76, 0.9, 0.98, 0.8, 0.64],
  },
  "Karnataka (BESCOM)": {
    name: "Bangalore Electricity Supply Co.",
    tariff: 8.2,
    coords: [12.9716, 77.5946],
    solarIrradianceFactor: [1.02, 1.12, 1.2, 1.15, 1.05, 0.78, 0.68, 0.72, 0.85, 0.95, 0.98, 1.0],
  },
  "Maharashtra (MSEDCL / Adani)": {
    name: "Maharashtra State Electricity / Adani",
    tariff: 9.4,
    coords: [19.076, 72.8777],
    solarIrradianceFactor: [0.95, 1.05, 1.18, 1.22, 1.15, 0.75, 0.58, 0.62, 0.8, 1.02, 1.0, 0.92],
  },
  "Rajasthan (JVVNL)": {
    name: "Jaipur Vidyut Vitran Nigam",
    tariff: 7.6,
    coords: [26.9124, 75.7873],
    solarIrradianceFactor: [0.82, 0.92, 1.1, 1.22, 1.25, 1.12, 0.92, 0.88, 1.02, 1.08, 0.92, 0.78],
  },
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function SolarLandingPage() {
  const [roofArea, setRoofArea] = useState<number>(120);
  const [selectedModuleId, setSelectedModuleId] = useState<string>("monoperc");
  const [selectedRegion, setSelectedRegion] = useState<string>("Delhi NCR (BSES / TPDDL)");
  const [shading, setShading] = useState<number>(10);
  const [activeModal, setActiveModal] = useState<SolutionDetail | null>(null);
  const [showFullTable, setShowFullTable] = useState<boolean>(false);

  // File Upload & Scanner State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [scannedResult, setScannedResult] = useState<{
    consumerType: string;
    monthlyUnits: number;
    monthlyBill: number;
    recommendedKw: number;
  } | null>(null);

  const activeDiscom = REGIONAL_DISCOMS[selectedRegion];
  const activeModule = MODULE_OPTIONS.find((m) => m.id === selectedModuleId) || MODULE_OPTIONS[1];
  const tariff = activeDiscom.tariff;

  // Engineering Computations
  const effectiveArea = roofArea * (1 - shading / 100);
  const capacityPerSqM = 0.15 * (activeModule.efficiency / 20);
  const systemCapacityKw = (effectiveArea * capacityPerSqM).toFixed(2);
  const capacityNum = parseFloat(systemCapacityKw);
  
  // Total panel count based on single module wattage
  const panelCount = Math.round((capacityNum * 1000) / activeModule.ratingWatts);

  // Daily generation accounting for bifacial rear albedo gain
  const bifacialMultiplier = 1 + activeModule.bifacialGain;
  const baseDailyGen = capacityNum * 4.6 * 0.78 * bifacialMultiplier;
  const annualGenKwh = Math.round(baseDailyGen * 365);
  const annualSavingsRs = Math.round(annualGenKwh * tariff);
  const baseCost = capacityNum * 52000;
  const subsidy = capacityNum <= 2 ? 30000 * capacityNum : 78000;
  const netInvestment = Math.max(0, baseCost - subsidy);
  const paybackYears = (netInvestment / Math.max(1, annualSavingsRs)).toFixed(1);

  // 12-Month Generation Curve
  const monthlyGeneration = useMemo(() => {
    const daysInMonths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return activeDiscom.solarIrradianceFactor.map((factor, i) => {
      const units = Math.round(baseDailyGen * factor * daysInMonths[i]);
      return { month: MONTH_NAMES[i], units };
    });
  }, [baseDailyGen, activeDiscom]);

  const maxMonthlyGen = Math.max(...monthlyGeneration.map((m) => m.units), 100);

  // 25-Year Lifecycle Cashflow Simulation
  const lifecycleCashFlow = useMemo(() => {
    let runningNet = -netInvestment;
    const rows = [];
    const tariffEscalation = 0.04;
    const panelDegradation = activeModule.id === "bifacial" ? 0.005 : 0.007; // Bifacial degrades slower (0.5%/yr)
    const inverterReplacementCost = Math.round(capacityNum * 12000);

    for (let year = 1; year <= 25; year++) {
      const yearGeneration = annualGenKwh * Math.pow(1 - panelDegradation, year - 1);
      const yearTariff = tariff * Math.pow(1 + tariffEscalation, year - 1);
      const grossSavings = yearGeneration * yearTariff;
      
      const maintenance = year === 10 ? inverterReplacementCost : Math.round(capacityNum * 600);
      const netAnnualBenefit = grossSavings - maintenance;
      runningNet += netAnnualBenefit;

      rows.push({
        year,
        generation: Math.round(yearGeneration),
        effectiveTariff: yearTariff.toFixed(1),
        annualSavings: Math.round(grossSavings),
        maintenance,
        cumulativeProfit: Math.round(runningNet),
      });
    }
    return rows;
  }, [netInvestment, annualGenKwh, tariff, capacityNum, activeModule.id]);

  const lifetimeTotalSavings = lifecycleCashFlow[24]?.cumulativeProfit || 0;

  // File Processing & Simulation Logic
  const handleProcessFile = (file: File) => {
    setUploadedFileName(file.name);
    setIsScanning(true);
    setScannedResult(null);

    setTimeout(() => {
      const randomUnits = Math.floor(Math.random() * (750 - 280 + 1)) + 280;
      const bill = Math.round(randomUnits * tariff);
      const neededKw = Math.max(1, Math.round((randomUnits / (4.2 * 30)) * 10) / 10);
      
      setScannedResult({
        consumerType: `${file.name.substring(0, 20)}... (Sanctioned Load Active)`,
        monthlyUnits: randomUnits,
        monthlyBill: bill,
        recommendedKw: neededKw,
      });
      setIsScanning(false);
    }, 1200);
  };

  const handleSimulateScan = (units: number, billAmount: number, type: string) => {
    setUploadedFileName(null);
    setIsScanning(true);
    setScannedResult(null);

    setTimeout(() => {
      const neededKw = Math.max(1, Math.round((units / (4.2 * 30)) * 10) / 10);
      setScannedResult({
        consumerType: type,
        monthlyUnits: units,
        monthlyBill: billAmount,
        recommendedKw: neededKw,
      });
      setIsScanning(false);
    }, 1000);
  };

  const applyScannedResult = () => {
    if (!scannedResult) return;
    const estimatedAreaNeeded = Math.round(scannedResult.recommendedKw * 10 * (20 / activeModule.efficiency));
    setRoofArea(Math.min(500, Math.max(20, estimatedAreaNeeded)));
    setIsScannerOpen(false);
  };

  const solutions: SolutionDetail[] = [
    {
      title: "Residential Solar Systems",
      subtitle: "On-grid Rooftop Photovoltaic Systems",
      tag: "Residential",
      desc: "Grid-tied rooftop solar systems designed for urban homes and villas. Uses bi-directional net metering to export excess energy back to the DISCOM grid.",
      highlights: [
        "Direct DISCOM Net Metering Integration",
        "Up to 80% reduction in monthly utility bills",
        "25-year performance warranty with zero maintenance requirement",
      ],
      specs: [
        { label: "Typical Capacity", value: "3 kW - 10 kW" },
        { label: "Payback Period", value: "3.2 - 4.5 Years" },
        { label: "Area Needed", value: "80 - 300 sq. ft." },
      ],
    },
    {
      title: "Commercial & Industrial Solar",
      subtitle: "High-Yield Enterprise Captive Plants",
      tag: "Enterprise",
      desc: "Designed for commercial complexes, factories, and academic campuses to offset high-tier commercial electricity tariffs and fulfill corporate ESG goals.",
      highlights: [
        "Accelerated depreciation tax benefits (40% under Indian IT Act)",
        "Peak-load shaving and power factor management",
        "Real-time IoT string telemetry monitoring",
      ],
      specs: [
        { label: "Typical Capacity", value: "25 kW - 500 kW+" },
        { label: "Payback Period", value: "2.8 - 3.5 Years" },
        { label: "Area Needed", value: "2,000+ sq. ft." },
      ],
    },
    {
      title: "Solar Battery Storage (Hybrid)",
      subtitle: "Lithium Ferro Phosphate (LFP) Microgrids",
      tag: "Resilience",
      desc: "Hybrid inverter topologies with intelligent energy storage management for areas facing frequent load shedding or for achieving true off-grid independence.",
      highlights: [
        "Zero transfer-time UPS capability for essential appliances",
        "LFP chemistry with 6,000+ lifecycle guarantees",
        "Smart time-of-day (ToD) tariff arbitrage optimization",
      ],
      specs: [
        { label: "Storage Range", value: "5 kWh - 40 kWh" },
        { label: "Backup Runtime", value: "6 - 18 Hours" },
        { label: "Battery Chemistry", value: "LiFePO4 Safe Tier-1" },
      ],
    },
    {
      title: "PM Surya Ghar Muft Bijli Yojana",
      subtitle: "National Direct Benefit Transfer Subsidies",
      tag: "Govt Scheme",
      desc: "Official central government financial assistance providing direct bank transfer subsidies to speed up residential solar adoption across 1 Crore households.",
      highlights: [
        "Flat ₹30,000 subsidy for 1 kW systems",
        "Flat ₹60,000 subsidy for 2 kW systems",
        "Flat ₹78,000 maximum subsidy for 3 kW and higher systems",
      ],
      specs: [
        { label: "Target Outlay", value: "₹75,021 Crores" },
        { label: "Target Homes", value: "10 Million Units" },
        { label: "Subsidy Route", value: "National Portal DBT" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#111413] text-[#1c1b18] antialiased selection:bg-[#202923] selection:text-[#f7f5f0] relative overflow-hidden">
      {/* Background Ambience */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-40 mix-blend-luminosity bg-cover bg-center filter brightness-[0.7] contrast-125 print:hidden"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&q=80&w=2400')`,
        }}
      />
      <div className="fixed inset-0 bg-gradient-to-b from-[#111413]/70 via-[#111413]/40 to-[#111413] pointer-events-none print:hidden" />

      {/* Main Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-12 print:p-0 print:space-y-6">
        
        {/* Navigation */}
        <header className="flex items-center justify-between py-4 px-8 rounded-full bg-[#f4f1ea]/90 backdrop-blur-md shadow-2xl border border-[#e8e4d8] print:hidden">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-[#1c241f] text-[#f4f1ea] flex items-center justify-center shadow-md">
              <Sun className="h-4 w-4 text-[#d8c29d]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-serif tracking-tight text-xl font-bold text-[#1a211c]">SolarScope</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#1c241f]/10 text-[#1c241f] border border-[#1c241f]/20">
                SIH 2026
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs uppercase tracking-widest font-semibold text-[#57534d]">
            <a href="#studio" className="hover:text-[#1c241f] transition">Feasibility Studio</a>
            <a href="#projections" className="hover:text-[#1c241f] transition">25-Yr Financials</a>
            <a href="#solutions" className="hover:text-[#1c241f] transition">Solar Topologies</a>
            <a href="#national-impact" className="hover:text-[#1c241f] transition">India's Impact</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsScannerOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#ece8dd] hover:bg-[#ded8c9] text-[#1c241f] text-xs font-semibold tracking-wide transition border border-[#ded8c9]"
            >
              <FileCheck2 className="h-3.5 w-3.5 text-amber-700" /> Scan DISCOM Bill
            </button>
            <button
              onClick={() => window.print()}
              className="px-5 py-2 rounded-full bg-[#1c241f] text-[#f7f5f0] text-xs font-semibold tracking-wide hover:bg-[#2c372f] transition shadow-md flex items-center gap-2"
            >
              <Printer className="h-3.5 w-3.5" /> Export Audit
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <section className="text-center py-16 sm:py-24 space-y-6 max-w-4xl mx-auto print:hidden">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#f4f1ea]/80 border border-[#e4dfd2] backdrop-blur-sm text-[11px] font-medium tracking-wide text-[#3f3d37]">
            <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse"></span>
            Smart India Hackathon • High-Resolution Geospatial Solar Engine
          </div>

          <h1 className="font-serif text-5xl sm:text-7xl lg:text-8xl tracking-tight text-[#fbfaf6] font-normal leading-[1.05]">
            Energy Saving <br />
            <span className="italic font-light text-[#dfd7c5]">Renewable Solar</span>
          </h1>

          <p className="text-sm sm:text-base text-[#cfcac0] max-w-2xl mx-auto font-light leading-relaxed">
            AI-driven rooftop GIS feasibility models, satellite irradiance computation, and state-level DISCOM net-metering audits.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#studio"
              className="px-8 py-3.5 rounded-full bg-[#f4f1ea] text-[#1c241f] text-sm font-semibold tracking-wide hover:bg-white transition shadow-xl flex items-center gap-2"
            >
              Launch Solar Studio <ArrowRight className="h-4 w-4" />
            </a>
            <button
              onClick={() => setIsScannerOpen(true)}
              className="px-6 py-3.5 rounded-full bg-[#1c241f]/80 hover:bg-[#1c241f] text-[#f7f5f0] border border-white/20 text-sm font-semibold tracking-wide transition flex items-center gap-2"
            >
              <FileCheck2 className="h-4 w-4 text-[#d8c29d]" /> Upload Electricity Bill
            </button>
          </div>
        </section>

        {/* Print Only Header */}
        <div className="hidden print:block border-b border-black pb-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="font-serif text-2xl font-bold text-black">SolarScope Rooftop Feasibility Audit</h1>
              <p className="text-xs text-gray-600">Smart India Hackathon 2026 • High-Precision GIS Photovoltaic Assessment</p>
            </div>
            <div className="text-right text-xs">
              <p className="font-semibold">Region: {selectedRegion}</p>
              <p className="text-gray-500">Module Tech: {activeModule.name} ({activeModule.ratingWatts}W)</p>
            </div>
          </div>
        </div>

        {/* Watermark Branding */}
        <div className="text-center select-none pointer-events-none -my-8 sm:-my-14 opacity-25 print:hidden">
          <span className="font-serif text-7xl sm:text-9xl lg:text-[14rem] font-bold text-[#f7f5f0] tracking-tighter">
            SolarScope
          </span>
        </div>

        {/* Interactive GIS Rooftop Feasibility Studio */}
        <section id="studio" className="bg-[#f7f5f0] rounded-[2.5rem] p-6 sm:p-12 shadow-2xl border border-[#ece8dd] space-y-8 print:p-4 print:shadow-none print:border">
          <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#e2ddd0] pb-6 gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#78716c]">Smart Feasibility Engine</span>
              <h2 className="font-serif text-3xl sm:text-4xl text-[#1a211c] mt-1 font-semibold">
                Simulate Your Rooftop Yield
              </h2>
            </div>
            
            <div className="flex items-center gap-2 bg-[#ece8dd] p-1.5 rounded-xl border border-[#ded8c9] print:hidden">
              <span className="text-xs font-semibold px-2 text-[#57534d]">DISCOM:</span>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="bg-white border-none text-xs font-semibold rounded-lg px-3 py-1.5 outline-none text-[#1c241f] shadow-sm cursor-pointer"
              >
                {Object.keys(REGIONAL_DISCOMS).map((reg) => (
                  <option key={reg} value={reg}>
                    {reg}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Studio Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Live Leaflet Satellite Viewport */}
            <div className="lg:col-span-7 space-y-6 print:hidden">
              <RooftopMap
                cityCoordinates={activeDiscom.coords}
                onAreaCalculated={(newArea) => setRoofArea(newArea)}
              />

              {/* 12-Month Generation Seasonal Curve Chart */}
              <div className="bg-[#1c241f] p-5 sm:p-6 rounded-2xl border border-white/10 text-[#f7f5f0] space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#d8c29d]">
                    <BarChart3 className="h-4 w-4" /> 12-Month Seasonal Generation (kWh)
                  </div>
                  <span className="text-[11px] font-mono text-white/60">
                    Annual Total: <b className="text-white">{annualGenKwh.toLocaleString("en-IN")} units</b>
                  </span>
                </div>

                {/* Bar Graph Visual */}
                <div className="h-32 flex items-end justify-between gap-1.5 pt-4 pb-1 border-b border-white/10">
                  {monthlyGeneration.map((item, idx) => {
                    const heightPercent = Math.max(12, Math.round((item.units / maxMonthlyGen) * 100));
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group relative h-full justify-end">
                        <div className="opacity-0 group-hover:opacity-100 transition absolute -top-7 bg-white text-slate-900 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap pointer-events-none z-20">
                          {item.units} kWh
                        </div>
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-t-sm transition-all duration-300 ${
                            idx === 4 || idx === 3
                              ? "bg-amber-400"
                              : idx === 6 || idx === 7
                              ? "bg-sky-500/70"
                              : "bg-[#d8c29d]/80 group-hover:bg-[#d8c29d]"
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* X-Axis Month Labels */}
                <div className="flex justify-between text-[10px] font-mono text-white/50 px-0.5">
                  {monthlyGeneration.map((m, i) => (
                    <span key={i} className="flex-1 text-center">{m.month}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="lg:col-span-5 space-y-6 print:col-span-12 print:w-full">
              <div className="bg-[#f0ece1] p-6 rounded-2xl border border-[#e4decb] space-y-5">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#1c241f]">Audit Parameters</h3>
                  <button
                    onClick={() => setIsScannerOpen(true)}
                    className="text-[10px] font-bold text-amber-800 hover:underline flex items-center gap-1"
                  >
                    <FileCheck2 className="h-3 w-3" /> Auto-set from Bill
                  </button>
                </div>

                {/* Module Technology Switcher */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-[#57534d]">PV Module Technology</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {MODULE_OPTIONS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedModuleId(m.id)}
                        className={`p-2 rounded-xl text-left border transition flex flex-col justify-between ${
                          selectedModuleId === m.id
                            ? "bg-[#1c241f] text-[#f7f5f0] border-[#1c241f] shadow"
                            : "bg-white text-[#1c241f] border-[#ded8c9] hover:bg-[#eae6da]"
                        }`}
                      >
                        <div className="text-[10px] font-bold truncate">{m.name.split(" ")[0]}</div>
                        <div className="text-[9px] opacity-70 mt-1">{m.ratingWatts}W • {m.efficiency}%</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Slider 1 */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-[#57534d]">Rooftop Usable Area</span>
                    <span className="font-mono text-[#1c241f] font-bold">{roofArea} m²</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="500"
                    step="10"
                    value={roofArea}
                    onChange={(e) => setRoofArea(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#dcd5c2] rounded-lg appearance-none cursor-pointer accent-[#1c241f] print:hidden"
                  />
                  <div className="flex justify-between text-[10px] text-[#78716c]">
                    <span>20 m² (Villa)</span>
                    <span>500 m² (Industrial)</span>
                  </div>
                </div>

                {/* Slider 2 */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-[#57534d]">Obstacle Shading</span>
                    <span className="font-mono text-[#1c241f] font-bold">{shading}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="35"
                    step="1"
                    value={shading}
                    onChange={(e) => setShading(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#dcd5c2] rounded-lg appearance-none cursor-pointer accent-[#1c241f] print:hidden"
                  />
                </div>

                {/* Array Sizing Metrics */}
                <div className="p-3 bg-[#e8e4d8] rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[#78716c] block text-[10px]">Estimated Panel Array</span>
                    <span className="font-bold text-[#1c241f]">{panelCount} Panels ({activeModule.ratingWatts}W each)</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[#78716c] block text-[10px]">Tech Badge</span>
                    <span className="font-semibold text-amber-800 text-[11px]">{activeModule.badge}</span>
                  </div>
                </div>
              </div>

              {/* Financial Calculation Summary */}
              <div className="p-6 rounded-2xl bg-[#1c241f] text-[#f7f5f0] space-y-4 shadow-xl print:text-black print:bg-white print:border print:border-gray-300">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-widest text-white/60 print:text-gray-600">Annual Savings</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 print:text-emerald-800 font-medium">ROI ~24%</span>
                </div>
                <div className="font-serif text-4xl text-white font-bold print:text-black">
                  ₹{annualSavingsRs.toLocaleString("en-IN")}
                  <span className="text-xs font-sans font-normal text-white/50 print:text-gray-600 ml-1">/ year</span>
                </div>
                
                <hr className="border-white/10 print:border-gray-300" />

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-white/70 print:text-gray-700">
                    <span>System Capacity:</span>
                    <span className="font-mono text-white font-bold print:text-black">{systemCapacityKw} kWp</span>
                  </div>
                  <div className="flex justify-between text-white/70 print:text-gray-700">
                    <span>Gross Investment:</span>
                    <span className="font-mono text-white font-bold print:text-black">₹{Math.round(baseCost).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400 print:text-emerald-800">
                    <span>PM Surya Ghar Subsidy:</span>
                    <span className="font-mono font-semibold">- ₹{subsidy.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-white font-bold pt-1 border-t border-white/10 print:border-gray-300 print:text-black">
                    <span>Net Out-of-Pocket:</span>
                    <span className="font-mono text-[#d8c29d] print:text-black">₹{Math.round(netInvestment).toLocaleString("en-IN")}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-between text-xs print:bg-gray-100 print:border-gray-300">
                  <span className="text-white/70 print:text-gray-700">Estimated Payback:</span>
                  <span className="font-bold font-mono text-[#d8c29d] print:text-black text-sm">{paybackYears} Years</span>
                </div>
              </div>

            </div>

          </div>
        </section>

        {/* 25-Year Cumulative Financial Cash-Flow Table */}
        <section id="projections" className="bg-[#f7f5f0] rounded-[2.5rem] p-6 sm:p-12 shadow-2xl border border-[#ece8dd] space-y-6 print:p-4 print:shadow-none print:border">
          <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#e2ddd0] pb-6 gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#78716c]">Lifecycle Economic Modeling</span>
              <h2 className="font-serif text-3xl sm:text-4xl text-[#1a211c] mt-1 font-semibold">
                25-Year Cash Flow Projection
              </h2>
              <p className="text-xs text-[#6b665f] mt-1">
                Accounts for {activeModule.id === "bifacial" ? "0.5%" : "0.7%"}/year PV degradation, 4%/year DISCOM tariff inflation, and Year-10 inverter refurbishment.
              </p>
            </div>
            
            <div className="p-4 rounded-2xl bg-[#1c241f] text-[#f7f5f0] text-right shrink-0 print:bg-white print:text-black print:border">
              <div className="text-[10px] uppercase tracking-wider text-[#d8c29d] print:text-gray-600">25-Year Net Profit</div>
              <div className="font-serif text-2xl font-bold text-white print:text-black">₹{lifetimeTotalSavings.toLocaleString("en-IN")}</div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-[#e4decb] bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f0ece1] text-[#1c241f] font-semibold uppercase tracking-wider border-b border-[#e4decb]">
                <tr>
                  <th className="py-3 px-4">Year</th>
                  <th className="py-3 px-4">Yield (kWh)</th>
                  <th className="py-3 px-4">Grid Rate (₹/unit)</th>
                  <th className="py-3 px-4">Annual Savings</th>
                  <th className="py-3 px-4">O&M / Inverter</th>
                  <th className="py-3 px-4 text-right">Cumulative Net Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ece8dd] font-mono text-[#57534d]">
                {(showFullTable ? lifecycleCashFlow : lifecycleCashFlow.slice(0, 5)).map((row) => (
                  <tr key={row.year} className="hover:bg-[#fbfaf6] transition">
                    <td className="py-3 px-4 font-bold text-[#1a211c]">Year {row.year}</td>
                    <td className="py-3 px-4">{row.generation.toLocaleString("en-IN")}</td>
                    <td className="py-3 px-4">₹{row.effectiveTariff}</td>
                    <td className="py-3 px-4 text-emerald-700 font-semibold">+₹{row.annualSavings.toLocaleString("en-IN")}</td>
                    <td className="py-3 px-4 text-[#78716c]">{row.maintenance > 1000 ? `₹${row.maintenance.toLocaleString("en-IN")} (Inverter Refit)` : `₹${row.maintenance}`}</td>
                    <td className={`py-3 px-4 text-right font-bold ${row.cumulativeProfit >= 0 ? "text-emerald-700" : "text-amber-800"}`}>
                      {row.cumulativeProfit >= 0 ? `+₹${row.cumulativeProfit.toLocaleString("en-IN")}` : `-₹${Math.abs(row.cumulativeProfit).toLocaleString("en-IN")}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-center pt-2 print:hidden">
            <button
              onClick={() => setShowFullTable(!showFullTable)}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-[#1c241f] text-[#f7f5f0] text-xs font-semibold hover:bg-[#2c372f] transition shadow-md"
            >
              {showFullTable ? (
                <>Show Less <ChevronUp className="h-3.5 w-3.5" /></>
              ) : (
                <>View Complete 25-Year Schedule <ChevronDown className="h-3.5 w-3.5" /></>
              )}
            </button>
          </div>
        </section>

        {/* 4 Solutions Grid with Interactive Modals */}
        <section id="solutions" className="space-y-6 print:hidden">
          <div className="text-center space-y-2">
            <h2 className="font-serif text-4xl text-[#fbfaf6] font-normal">Solar Topologies & Schemes</h2>
            <p className="text-xs text-[#b8b3a7]">Explore architectures and government subsidies aligned with national energy targets.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {solutions.map((sol, idx) => (
              <div
                key={idx}
                className="bg-[#f7f5f0] p-6 rounded-2xl border border-[#ece8dd] flex flex-col justify-between h-64 hover:shadow-xl transition group"
              >
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#78716c] px-2 py-0.5 rounded bg-[#e8e4d8]">
                    {sol.tag}
                  </span>
                  <h4 className="font-serif text-lg font-bold text-[#1a211c] mt-3 mb-2">{sol.title}</h4>
                  <p className="text-xs text-[#6b665f] leading-relaxed font-light line-clamp-3">{sol.desc}</p>
                </div>
                <button
                  onClick={() => setActiveModal(sol)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#1c241f] group-hover:text-amber-800 transition cursor-pointer pt-3"
                >
                  Explore Details <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* National Rooftop Solar Progress in India */}
        <section id="national-impact" className="bg-[#f7f5f0] rounded-[2.5rem] p-8 sm:p-12 shadow-2xl border border-[#ece8dd] space-y-8 print:hidden">
          <div className="border-b border-[#e2ddd0] pb-4">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#78716c]">National Benchmark Data</span>
            <h3 className="font-serif text-2xl sm:text-3xl text-[#1a211c] font-semibold mt-1">
              India's Solar Rooftop Momentum
            </h3>
            <p className="text-xs text-[#6b665f]">
              Cumulative installations and economic savings tracked across states under the Ministry of New and Renewable Energy (MNRE).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            <div className="p-5 rounded-2xl bg-[#ece8dd]/50 border border-[#e2ddd0] space-y-1">
              <div className="font-serif text-3xl sm:text-4xl font-bold text-[#1a211c] tracking-tight">14.8 GW+</div>
              <div className="text-[11px] font-bold text-[#1c241f] uppercase tracking-wider">Cumulative Solar</div>
              <p className="text-[11px] text-[#78716c] leading-relaxed pt-1">Installed capacity across residential and industrial sectors nationwide.</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#ece8dd]/50 border border-[#e2ddd0] space-y-1">
              <div className="font-serif text-3xl sm:text-4xl font-bold text-[#1a211c] tracking-tight">₹18,200Cr+</div>
              <div className="text-[11px] font-bold text-[#1c241f] uppercase tracking-wider">Annual Tariff Savings</div>
              <p className="text-[11px] text-[#78716c] leading-relaxed pt-1">Direct reduction in consumer power bills via DISCOM net-metering.</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#ece8dd]/50 border border-[#e2ddd0] space-y-1">
              <div className="font-serif text-3xl sm:text-4xl font-bold text-[#1a211c] tracking-tight">18.5M+ T</div>
              <div className="text-[11px] font-bold text-[#1c241f] uppercase tracking-wider">Annual CO₂ Abated</div>
              <p className="text-[11px] text-[#78716c] leading-relaxed pt-1">Contribution towards India's Net-Zero 2070 decarbonization pledge.</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#ece8dd]/50 border border-[#e2ddd0] space-y-1">
              <div className="font-serif text-3xl sm:text-4xl font-bold text-[#1a211c] tracking-tight">10 Million</div>
              <div className="text-[11px] font-bold text-[#1c241f] uppercase tracking-wider">Target Households</div>
              <p className="text-[11px] text-[#78716c] leading-relaxed pt-1">Under PM Surya Ghar Muft Bijli Yojana with direct DBT assistance.</p>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section id="benefits" className="bg-[#f7f5f0] rounded-[2.5rem] p-8 sm:p-14 shadow-2xl border border-[#ece8dd] print:hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-5 space-y-4">
              <h2 className="font-serif text-4xl sm:text-5xl text-[#1a211c] font-normal leading-tight">
                Why Transition <br />
                <span className="italic">To Rooftop Solar</span> <br />
                Power?
              </h2>
            </div>
            <div className="lg:col-span-7 flex items-center">
              <p className="text-sm sm:text-base text-[#57534d] leading-relaxed font-light">
                Solar Rooftop systems provide complete immunity against accelerating grid power tariffs while unlocking generous central capital subsidies.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 pt-12 border-t border-[#e5dfd2]">
            <div className="space-y-2">
              <h4 className="font-serif text-lg font-bold text-[#1c241f]">Tariff Immunity</h4>
              <p className="text-xs text-[#6b665f] leading-relaxed">
                Protect household and factory operating budgets from scheduled annual DISCOM rate hikes.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-serif text-lg font-bold text-[#1c241f]">Accelerated ROI</h4>
              <p className="text-xs text-[#6b665f] leading-relaxed">
                High solar irradiance in Indian states ensures full capital expenditure recovery within 3 to 4 years.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-serif text-lg font-bold text-[#1c241f]">Central DBT Subsidies</h4>
              <p className="text-xs text-[#6b665f] leading-relaxed">
                Direct benefit transfers of up to ₹78,000 deposited straight to your bank account via the National Portal.
              </p>
            </div>
          </div>
        </section>

        {/* Modal: Interactive Electricity Bill Scanner */}
        {isScannerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-[#f7f5f0] border border-[#ece8dd] rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl relative text-[#1c1b18]">
              <button
                onClick={() => setIsScannerOpen(false)}
                className="absolute top-6 right-6 h-8 w-8 rounded-full bg-[#ece8dd] hover:bg-[#ded8c9] flex items-center justify-center text-[#1c241f] transition"
              >
                <X className="h-4 w-4" />
              </button>

              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#78716c]">
                  <FileCheck2 className="h-4 w-4 text-amber-700" />
                  <span>AI Electricity Bill Scanner</span>
                </div>
                <h3 className="font-serif text-2xl font-bold text-[#1a211c] mt-1">
                  DISCOM Tariff & Consumption OCR
                </h3>
                <p className="text-xs text-[#57534d] mt-1">
                  Upload an Indian electricity bill or click a sample preset to auto-detect monthly units.
                </p>
              </div>

              {/* Hidden HTML File Input for System File Browser */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleProcessFile(e.target.files[0]);
                  }
                }}
              />

              {/* Clickable & Drag-and-Drop Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleProcessFile(e.dataTransfer.files[0]);
                  }
                }}
                className={`p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center space-y-2 cursor-pointer transition ${
                  isDragOver
                    ? "border-amber-600 bg-amber-50"
                    : "border-[#ded8c9] bg-white/70 hover:bg-white hover:border-[#c5bea9]"
                }`}
              >
                <UploadCloud className={`h-8 w-8 ${isDragOver ? "text-amber-700" : "text-[#78716c]"}`} />
                <div className="text-xs font-semibold text-[#1a211c]">
                  {uploadedFileName ? (
                    <span className="text-emerald-700 font-bold">{uploadedFileName}</span>
                  ) : (
                    "Click to browse or drag & drop DISCOM bill (PDF or JPG)"
                  )}
                </div>
                <div className="text-[11px] text-[#78716c]">Supported: BSES, UPPCL, BESCOM, MSEDCL, JVVNL</div>
              </div>

              {/* Sample Bill Buttons for Demo */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716c]">
                  Quick Demonstration Presets:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSimulateScan(350, 2750, "Urban 2-BHK Domestic (BSES)")}
                    className="p-3 text-left rounded-xl bg-[#ece8dd] hover:bg-[#ded8c9] transition border border-[#ded8c9]"
                  >
                    <div className="text-xs font-bold text-[#1a211c]">Urban Home (350 Units)</div>
                    <div className="text-[10px] text-[#78716c]">Monthly Bill: ~₹2,750</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSimulateScan(1400, 12800, "Commercial Complex (UPPCL)")}
                    className="p-3 text-left rounded-xl bg-[#ece8dd] hover:bg-[#ded8c9] transition border border-[#ded8c9]"
                  >
                    <div className="text-xs font-bold text-[#1a211c]">Commercial (1,400 Units)</div>
                    <div className="text-[10px] text-[#78716c]">Monthly Bill: ~₹12,800</div>
                  </button>
                </div>
              </div>

              {/* Scan in progress indicator */}
              {isScanning && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3 text-xs text-amber-900 font-semibold">
                  <Loader2 className="h-4 w-4 animate-spin text-amber-700" />
                  <span>Parsing OCR units, tariff slabs, and sanctioned load...</span>
                </div>
              )}

              {/* Scanned Result Card */}
              {scannedResult && !isScanning && (
                <div className="p-4 rounded-2xl bg-white border border-[#e4decb] space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-emerald-800">Bill Recognized: {scannedResult.consumerType}</span>
                    <span className="font-mono text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">100% OCR Match</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div className="p-2 rounded-lg bg-[#f7f5f0]">
                      <div className="text-[10px] text-[#78716c]">Monthly Units</div>
                      <div className="text-sm font-bold font-mono text-[#1c241f]">{scannedResult.monthlyUnits} kWh</div>
                    </div>
                    <div className="p-2 rounded-lg bg-[#f7f5f0]">
                      <div className="text-[10px] text-[#78716c]">Monthly Bill</div>
                      <div className="text-sm font-bold font-mono text-[#1c241f]">₹{scannedResult.monthlyBill.toLocaleString("en-IN")}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <div className="text-[10px] text-amber-900">Recommended Size</div>
                      <div className="text-sm font-bold font-mono text-amber-800">{scannedResult.recommendedKw} kWp</div>
                    </div>
                  </div>

                  <button
                    onClick={applyScannedResult}
                    className="w-full py-2.5 rounded-xl bg-[#1c241f] hover:bg-[#2c372f] text-white text-xs font-bold transition shadow"
                  >
                    Apply Recommended Rooftop Sizing
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Interactive Detail Modal */}
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
            <div className="bg-[#f7f5f0] border border-[#ece8dd] rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl relative">
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-6 right-6 h-8 w-8 rounded-full bg-[#ece8dd] hover:bg-[#ded8c9] flex items-center justify-center text-[#1c241f] transition"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#78716c] px-2.5 py-0.5 rounded bg-[#e8e4d8]">
                  {activeModal.tag}
                </span>
                <h3 className="font-serif text-2xl font-bold text-[#1a211c] mt-2">{activeModal.title}</h3>
                <p className="text-xs text-[#57534d]">{activeModal.subtitle}</p>
              </div>

              <p className="text-xs text-[#6b665f] leading-relaxed">{activeModal.desc}</p>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#1c241f]">Key Specifications</h4>
                <div className="grid grid-cols-3 gap-2">
                  {activeModal.specs.map((sp, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-[#ece8dd] text-center">
                      <div className="text-[10px] text-[#78716c]">{sp.label}</div>
                      <div className="text-xs font-bold font-mono text-[#1c241f] mt-0.5">{sp.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#1c241f]">Core Highlights</h4>
                <div className="space-y-1.5">
                  {activeModal.highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-[#57534d]">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => {
                    setActiveModal(null);
                    window.location.href = "#studio";
                  }}
                  className="px-6 py-2.5 rounded-full bg-[#1c241f] text-[#f7f5f0] text-xs font-semibold hover:bg-[#2c372f] transition"
                >
                  Test on Your Roof
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="pt-8 pb-12 border-t border-white/10 text-center text-xs text-[#a8a29e] flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4 text-[#d8c29d]" />
            <span className="font-serif font-bold text-white text-sm">SolarScope Engine</span>
            <span>• Smart India Hackathon 2026</span>
          </div>
          <p className="text-[11px]">National GIS Rooftop Solar Feasibility & DBT Subsidy Analyzer.</p>
        </footer>

      </div>
    </div>
  );
}   