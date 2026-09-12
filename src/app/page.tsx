"use client";

import React, { useState, useMemo } from "react";
import {
  Sun,
  Zap,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  MessageSquare,
  Building,
  Home,
  Clock,
  TrendingDown,
  Award,
} from "lucide-react";

export default function SolarCalculatorPage() {
  const [monthlyBill, setMonthlyBill] = useState<number>(3500);
  const [propertyType, setPropertyType] = useState<"residential" | "commercial">("residential");
  const [roofArea, setRoofArea] = useState<number>(300);

  // Client Lead Form State
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [customerPincode, setCustomerPincode] = useState<string>("");
  const [formSubmitted, setFormSubmitted] = useState<boolean>(false);

  // Solar Math Engine based on PM Surya Ghar Muft Bijli Yojana specs
  const calculations = useMemo(() => {
    const unitsPerMonth = monthlyBill / 7.5;
    const dailyUnitsNeeded = unitsPerMonth / 30;

    const rawCapacity = dailyUnitsNeeded / 4;
    let recommendedKW = Math.round(rawCapacity * 2) / 2;
    if (recommendedKW < 1) recommendedKW = 1;

    const grossCost = recommendedKW * 62000;

    let subsidy = 0;
    if (propertyType === "residential") {
      if (recommendedKW >= 3) {
        subsidy = 78000;
      } else if (recommendedKW >= 2) {
        subsidy = 60000;
      } else if (recommendedKW >= 1) {
        subsidy = 30000;
      }
    }

    const netCost = Math.max(0, grossCost - subsidy);
    const annualSavings = monthlyBill * 12 * 0.92;
    const paybackYears = Number((netCost / annualSavings).toFixed(1));
    const requiredRoofSqFt = recommendedKW * 90;

    return {
      recommendedKW,
      grossCost,
      subsidy,
      netCost,
      annualSavings,
      paybackYears,
      requiredRoofSqFt,
    };
  }, [monthlyBill, propertyType]);

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerPhone || customerPhone.length < 10) return;
    setFormSubmitted(true);
  };

  const createWhatsAppLink = () => {
    const text = encodeURIComponent(
      `Hello, I would like to request an official rooftop inspection for a ${calculations.recommendedKW} kW solar system. My monthly bill is ₹${monthlyBill}.`
    );
    return `https://wa.me/?text=${text}`;
  };

  return (
    <div className="min-h-screen bg-[#0b0f0e] text-[#f2ede4] antialiased selection:bg-amber-500 selection:text-black">
      {/* Background Glow */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(245,158,11,0.12),rgba(0,0,0,0))] pointer-events-none" />

      {/* Navigation */}
      <header className="sticky top-0 z-40 bg-[#0b0f0e]/85 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sun className="h-5 w-5" />
            </div>
            <div>
              <span className="font-serif text-lg font-bold tracking-tight text-white block leading-tight">
                SuryaScope
              </span>
              <span className="text-[10px] text-white/50 font-mono tracking-wide uppercase">
                Rooftop Solar & Subsidy Advisory Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="#calculator"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition shadow-lg shadow-amber-500/20"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Calculate Savings</span>
            </a>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
        {/* Hero Section */}
        <section className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-semibold tracking-wide">
            <ShieldCheck className="h-4 w-4" />
            <span>PM Surya Ghar Muft Bijli Yojana Benchmark Sizing</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl font-normal text-white leading-tight">
            Cut Electricity Bills by Up to 90%. <br />
            <span className="italic text-amber-400 font-light">With Up to ₹78,000 Direct Subsidy.</span>
          </h1>

          <p className="text-sm sm:text-base text-white/70 max-w-2xl mx-auto font-light leading-relaxed">
            Estimate your rooftop solar sizing, net investment after central financial assistance, and ROI payback period in under 30 seconds.
          </p>
        </section>

        {/* Calculator */}
        <section id="calculator" className="bg-[#121715] border border-white/10 rounded-3xl p-5 sm:p-8 shadow-2xl space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                Interactive Sizing Engine
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-white mt-0.5">
                Rooftop Solar & Subsidy Calculator
              </h2>
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-white/5 rounded-xl border border-white/10 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setPropertyType("residential")}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition ${
                  propertyType === "residential"
                    ? "bg-amber-500 text-black font-bold"
                    : "text-white/60 hover:text-white"
                }`}
              >
                <Home className="h-3.5 w-3.5" /> Residential
              </button>
              <button
                type="button"
                onClick={() => setPropertyType("commercial")}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition ${
                  propertyType === "commercial"
                    ? "bg-amber-500 text-black font-bold"
                    : "text-white/60 hover:text-white"
                }`}
              >
                <Building className="h-3.5 w-3.5" /> Commercial
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Sliders */}
            <div className="lg:col-span-6 space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-white/70">Average Monthly Electricity Bill</label>
                  <span className="font-mono text-lg font-bold text-amber-400">
                    ₹{monthlyBill.toLocaleString("en-IN")}
                  </span>
                </div>
                <input
                  type="range"
                  min="1000"
                  max="25000"
                  step="500"
                  value={monthlyBill}
                  onChange={(e) => setMonthlyBill(Number(e.target.value))}
                  className="w-full h-2.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <div className="flex justify-between text-[10px] font-mono text-white/40">
                  <span>₹1,000/mo</span>
                  <span>₹12,000/mo</span>
                  <span>₹25,000+/mo</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-white/70">Available Rooftop Area</label>
                  <span className="font-mono text-sm font-bold text-white">
                    {roofArea} sq. ft.
                  </span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="2000"
                  step="50"
                  value={roofArea}
                  onChange={(e) => setRoofArea(Number(e.target.value))}
                  className="w-full h-2.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <p className="text-[11px] text-white/50">
                  Recommended setup requires approx. <span className="text-amber-400 font-semibold">{calculations.requiredRoofSqFt} sq. ft.</span> of shadow-free area.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-amber-400 font-semibold">
                  <Zap className="h-4 w-4" />
                  <span>Central Financial Assistance (CFA)</span>
                </div>
                <p className="text-white/70 leading-relaxed text-[11px]">
                  Under PM Surya Ghar Muft Bijli Yojana, residential subsidies are credited directly into consumer bank accounts upon net-meter commissioning by regional power DISCOMs.
                </p>
              </div>
            </div>

            {/* Calculations Breakdown Card */}
            <div className="lg:col-span-6 bg-gradient-to-br from-[#18201c] to-[#0f1412] p-6 rounded-2xl border border-amber-500/25 space-y-5 shadow-xl">
              <div className="flex justify-between items-start border-b border-white/10 pb-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-white/50">
                    Recommended System
                  </span>
                  <div className="text-2xl font-bold font-serif text-white">
                    {calculations.recommendedKW} kWp Grid-Connected Setup
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-white/50">Payback Period</span>
                  <div className="text-xl font-mono font-bold text-amber-400">
                    ~{calculations.paybackYears} Years
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-white/40 block text-[10px] uppercase">Standard Plant Cost</span>
                  <span className="font-mono text-sm font-semibold text-white/80">
                    ₹{calculations.grossCost.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <span className="text-emerald-400 block text-[10px] uppercase font-bold">PM Surya Ghar Subsidy</span>
                  <span className="font-mono text-sm font-bold text-emerald-300">
                    - ₹{calculations.subsidy.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/25 col-span-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-amber-400 block text-[10px] uppercase font-bold">Effective Investment</span>
                      <span className="font-mono text-lg font-bold text-white">
                        ₹{calculations.netCost.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-white/40 block text-[10px] uppercase">Estimated Bill Savings</span>
                      <span className="font-mono text-sm font-bold text-emerald-400">
                        ₹{Math.round(calculations.annualSavings).toLocaleString("en-IN")}/yr
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href="#contact"
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  <span>Request Full Site Quotation</span>
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Value Prop */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-5 rounded-2xl bg-[#121715] border border-white/10 space-y-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Award className="h-5 w-5" />
            </div>
            <h3 className="font-serif text-base font-bold text-white">High-Efficiency DCR Modules</h3>
            <p className="text-xs text-white/60 leading-relaxed">
              Designed for Mono PERC and TOPCon cell architectures with verified 25-year linear generation warranties.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#121715] border border-white/10 space-y-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
            <h3 className="font-serif text-base font-bold text-white">Net-Metering Coordination</h3>
            <p className="text-xs text-white/60 leading-relaxed">
              Standardized inspection protocols and bi-directional meter documentation handled with state electricity boards.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#121715] border border-white/10 space-y-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <TrendingDown className="h-5 w-5" />
            </div>
            <h3 className="font-serif text-base font-bold text-white">Rapid Capital Payback</h3>
            <p className="text-xs text-white/60 leading-relaxed">
              Achieve total cost recovery within 3 to 4 years while securing 20+ years of virtually cost-free electricity.
            </p>
          </div>
        </section>

        {/* Lead Capture */}
        <section id="contact" className="bg-[#121715] border border-white/10 rounded-3xl p-6 sm:p-10 max-w-2xl mx-auto shadow-2xl space-y-5">
          <div className="text-center space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
              On-Site Solar Assessment
            </span>
            <h3 className="font-serif text-2xl font-bold text-white">
              Request Your Engineering Proposal
            </h3>
            <p className="text-xs text-white/60">
              Get an accurate shadow-analysis survey and tailored plant design from verified regional EPC installers.
            </p>
          </div>

          {formSubmitted ? (
            <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-center space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
              <h4 className="text-sm font-bold text-emerald-300">Survey Request Registered</h4>
              <p className="text-xs text-white/70 max-w-sm mx-auto">
                A verified technical representative will connect with you at <span className="font-mono text-white font-bold">{customerPhone}</span> to confirm roof specifications.
              </p>
            </div>
          ) : (
            <form onSubmit={handleLeadSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-white/70 font-medium">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Sharma"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-[#18201c] border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-amber-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-white/70 font-medium">Mobile / WhatsApp Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile number"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-[#18201c] border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-amber-500 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-white/70 font-medium">City / Installation Pincode</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 201310"
                    value={customerPincode}
                    onChange={(e) => setCustomerPincode(e.target.value)}
                    className="w-full bg-[#18201c] border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-amber-500 text-xs font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 mt-2"
              >
                <span>Request Free Roof Feasibility Inspection</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}
        </section>

        {/* Footer */}
        <footer className="pt-8 border-t border-white/10 text-xs text-white/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4 text-amber-400" />
            <span className="font-serif font-bold text-white">SuryaScope</span>
            <span>• Rooftop Solar Sizing & Subsidy Advisory</span>
          </div>
          <p className="text-[11px]">
            © {new Date().getFullYear()} SuryaScope. All rights reserved.
          </p>
        </footer>
      </main>
    </div>
  );
}
