"use client";

import { useState, useEffect } from "react";
import { Building2, Plus, Pencil, Trash2, Loader2, Image as ImageIcon, Search, X, Users, ChevronDown, FileText, ExternalLink } from "lucide-react";
import Image from "next/image";

type SlotCountInfo = {
  slot_number: number;
  filled_count: number;
  max_limit: number;
};

type Company = {
  id: string;
  name: string;
  logo_url: string | null;
  is_it: boolean;
  created_at: string;
  slot_counts?: SlotCountInfo[];
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isIt, setIsIt] = useState(false);
  const [slotLimits, setSlotLimits] = useState<{ [key: number]: number }>({ 1: 10, 2: 10, 3: 10, 4: 10 });
  const [modalError, setModalError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Company candidates modal state
  const [viewingCompanyCandidates, setViewingCompanyCandidates] = useState<Company | null>(null);
  const [companyCandidates, setCompanyCandidates] = useState<any[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [candSearch, setCandSearch] = useState("");
  const [candPrefFilter, setCandPrefFilter] = useState("");
  const [candSlotFilter, setCandSlotFilter] = useState("");

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const res = await fetch("/api/v1/company/getAllCompany");
      const data = await res.json();
      if (data.success) {
        setCompanies(data.companies);
      }
    } catch (error) {
      console.error("Failed to fetch companies:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyCandidates = async (company: Company) => {
    setViewingCompanyCandidates(company);
    setLoadingCandidates(true);
    setCandSearch("");
    setCandPrefFilter("");
    setCandSlotFilter("");
    try {
      const res = await fetch(`/api/v1/company/candidates?companyId=${company.id}`);
      const data = await res.json();
      if (data.success) {
        setCompanyCandidates(data.candidates);
      }
    } catch (error) {
      console.error("Failed to fetch company candidates:", error);
    } finally {
      setLoadingCandidates(false);
    }
  };

  const openModal = (company?: Company) => {
    setModalError(null);
    if (company) {
      setEditingId(company.id);
      setName(company.name);
      setLogoPreview(company.logo_url);
      setIsIt(company.is_it);
      const limits: { [key: number]: number } = { 1: 10, 2: 10, 3: 10, 4: 10 };
      if (company.slot_counts) {
        for (const sc of company.slot_counts) {
          limits[sc.slot_number] = sc.max_limit ?? 10;
        }
      }
      setSlotLimits(limits);
    } else {
      setEditingId(null);
      setName("");
      setLogoPreview(null);
      setIsIt(false);
      setSlotLimits({ 1: 10, 2: 10, 3: 10, 4: 10 });
    }
    setLogoFile(null);
    setIsModalOpen(true);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const editingCompany = companies.find((c) => c.id === editingId);
  const hasSlotViolation = editingId !== null && [1, 2, 3, 4].some((sNum) => {
    const filled = editingCompany?.slot_counts?.find((s) => s.slot_number === sNum)?.filled_count ?? 0;
    return (slotLimits[sNum] ?? 10) < filled;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (hasSlotViolation) {
      setModalError("There are already more candidates registered for this slot, please provide a higher limit");
      return;
    }

    setIsSubmitting(true);

    try {
      let finalLogoUrl = logoPreview;

      // If a new file is selected, upload to Cloudinary first
      if (logoFile) {
        const formData = new FormData();
        formData.append("file", logoFile);
        formData.append("folder", "riseupmora/companies");

        const uploadRes = await fetch("/api/v1/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        
        if (uploadData.success) {
          finalLogoUrl = uploadData.url;
        } else {
          throw new Error("Logo upload failed");
        }
      }

      const payload = {
        id: editingId,
        name,
        logo_url: finalLogoUrl,
        is_it: isIt,
        slot_limits: slotLimits,
      };

      const url = editingId 
        ? "/api/v1/company/updateCompany" 
        : "/api/v1/company/addCompany";
        
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        setIsModalOpen(false);
        fetchCompanies();
      } else {
        setModalError(data.error || "Something went wrong");
      }
    } catch (error: any) {
      console.error("Submission error:", error);
      setModalError(error?.message || "Failed to submit");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this company?")) return;

    try {
      const res = await fetch("/api/v1/company/deleteCompany", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();

      if (data.success) {
        fetchCompanies();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#002454]">Companies</h1>
          <p className="text-sm text-[#002454]/60">Manage participating companies</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 rounded-xl bg-[#f6c430] px-4 py-2.5 text-sm font-bold text-[#002454] transition-all hover:-translate-y-0.5 hover:shadow-lg"
        >
          <Plus size={18} />
          Add Company
        </button>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search
          size={17}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#002454]/40 pointer-events-none"
        />
        <input
          type="text"
          placeholder="Search companies…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-[#002454]/10 bg-white py-2.5 pl-10 pr-10 text-sm text-[#002454] outline-none transition-all focus:border-[#33aeda] focus:ring-2 focus:ring-[#33aeda]/10"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-[#002454]/40 hover:text-[#002454]/70"
            aria-label="Clear search"
          >
            <X size={15} />
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#002454]/10 bg-white shadow-sm">
        <div style={{ maxHeight: 'calc(100vh - 280px)' }} className="overflow-auto w-full">
          <table className="w-full text-left text-sm relative">
            <thead className="sticky top-0 z-10 bg-[#f8fcfe] text-[#002454]/60 shadow-[0_1px_0_0_rgba(0,36,84,0.05)]">
            <tr>
              <th className="px-6 py-4 font-bold">Company</th>
              <th className="px-6 py-4 font-bold">Type</th>
              <th className="px-6 py-4 font-bold">Slot Limits (Limit / Reg)</th>
              <th className="px-6 py-4 font-bold">Added On</th>
              <th className="px-6 py-4 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#002454]/5">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-[#002454]/50">
                  <Loader2 className="mx-auto animate-spin" />
                </td>
              </tr>
            ) : filteredCompanies.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-[#002454]/50">
                  {searchQuery
                    ? `No companies match "${searchQuery}".`
                    : "No companies found. Add one to get started."}
                </td>
              </tr>
            ) : (
              filteredCompanies.map((company) => (
                <tr key={company.id} className="transition-colors hover:bg-[#f8fcfe]/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#002454]/10 bg-gray-50">
                        {company.logo_url ? (
                          <img
                            src={company.logo_url}
                            alt={company.name}
                            className="h-full w-full object-contain p-1"
                          />
                        ) : (
                          <Building2 size={20} className="text-[#002454]/30" />
                        )}
                      </div>
                      <span className="font-bold text-[#002454]">{company.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
                        company.is_it
                          ? "bg-[#1688b2]/10 text-[#1688b2]"
                          : "bg-[#f6c430]/15 text-[#002454]/70"
                      }`}
                    >
                      {company.is_it ? "IT / CS" : "Non-IT"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs">
                    <div className="flex flex-wrap gap-1.5">
                      {[1, 2, 3, 4].map((sNum) => {
                        const info = company.slot_counts?.find((s) => s.slot_number === sNum);
                        const limit = info?.max_limit ?? 10;
                        const filled = info?.filled_count ?? 0;
                        return (
                          <span
                            key={sNum}
                            className="inline-flex items-center gap-1 rounded-md border border-[#002454]/10 bg-[#f8fcfe] px-2 py-0.5 text-[11px] font-bold text-[#002454]"
                            title={`Slot ${sNum}: ${filled} candidates registered / max limit ${limit}`}
                          >
                            S{sNum}: <span className="text-[#1688b2]">{limit}</span>
                            <span className="text-[#002454]/40 font-normal">({filled})</span>
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[#002454]/70">
                    {new Date(company.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => fetchCompanyCandidates(company)}
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#1688b2] bg-[#1688b2]/10 transition-colors hover:bg-[#1688b2]/20"
                        title="View Candidates"
                      >
                        <Users size={15} /> Candidates
                      </button>
                      <button
                        onClick={() => openModal(company)}
                        className="rounded-lg p-2 text-[#33aeda] transition-colors hover:bg-[#33aeda]/10"
                        title="Edit Company"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(company.id)}
                        className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50"
                        title="Delete Company"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#002454]/20 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="mb-6 text-xl font-extrabold text-[#002454]">
              {editingId ? "Edit Company" : "Add Company"}
            </h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-bold text-[#002454]">
                  Company Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-[#002454]/10 bg-white px-4 py-2.5 text-[#002454] outline-none focus:border-[#33aeda] focus:ring-2 focus:ring-[#33aeda]/10"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-bold text-[#002454]">
                  Company Logo
                </label>
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#002454]/10 bg-gray-50">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Preview" className="h-full w-full object-contain p-1" />
                    ) : (
                      <ImageIcon size={24} className="text-[#002454]/30" />
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="w-full text-sm text-[#002454]/70 file:mr-4 file:rounded-full file:border-0 file:bg-[#f6c430]/20 file:px-4 file:py-2 file:text-sm file:font-bold file:text-[#002454] hover:file:bg-[#f6c430]/30"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isIt}
                    onChange={(e) => setIsIt(e.target.checked)}
                    className="h-5 w-5 rounded border-[#002454]/20 text-[#1688b2] accent-[#1688b2] cursor-pointer"
                  />
                  <span className="text-sm font-bold text-[#002454]">
                    IT / CS Related Company
                  </span>
                </label>
                <p className="mt-1 ml-8 text-xs text-[#002454]/50">
                  Check this if the company is related to IT or Computer Science
                </p>
              </div>

              {/* Time Slot Limits (Capacity) Section */}
              <div className="border-t border-[#002454]/10 pt-4">
                <label className="mb-2 block text-sm font-bold text-[#002454]">
                  Time Slot Limits (Capacity per Slot)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { slot: 1, label: "Slot 1 (10:00 - 11:00)" },
                    { slot: 2, label: "Slot 2 (11:00 - 12:00)" },
                    { slot: 3, label: "Slot 3 (1:30 - 2:30)" },
                    { slot: 4, label: "Slot 4 (2:30 - 3:30)" },
                  ].map(({ slot, label }) => {
                    const currentFilled = editingCompany?.slot_counts?.find((s) => s.slot_number === slot)?.filled_count ?? 0;
                    const currentLimit = slotLimits[slot] ?? 10;
                    const isViolation = editingId !== null && currentLimit < currentFilled;

                    return (
                      <div key={slot} className="rounded-xl border border-[#002454]/10 bg-[#f8fcfe] p-3">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs font-bold text-[#002454]">{label}</span>
                          {editingId !== null && (
                            <span className="text-[11px] font-semibold text-[#002454]/60">
                              Registered: {currentFilled}
                            </span>
                          )}
                        </div>
                        <input
                          type="number"
                          min={currentFilled || 1}
                          value={currentLimit}
                          onChange={(e) => {
                            setModalError(null);
                            const val = parseInt(e.target.value) || 0;
                            setSlotLimits((prev) => ({ ...prev, [slot]: val }));
                          }}
                          className={`w-full rounded-lg border bg-white px-3 py-1.5 text-sm outline-none font-bold ${
                            isViolation
                              ? "border-red-500 text-red-600 focus:ring-2 focus:ring-red-200"
                              : "border-[#002454]/10 text-[#002454] focus:border-[#33aeda]"
                          }`}
                          required
                        />
                        {isViolation && (
                          <p className="mt-1 text-xs font-bold text-red-600 leading-snug">
                            There are already more candidates registered for this slot, please provide a higher limit
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {modalError && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-bold text-red-600 leading-snug">
                  {modalError}
                </div>
              )}

              <div className="mt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-sm font-bold text-[#002454]/70 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || hasSlotViolation}
                  className="flex items-center justify-center rounded-xl bg-[#f6c430] px-4 py-2.5 text-sm font-bold text-[#002454] hover:shadow-lg disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : "Save Company"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Viewing Company Candidates Modal */}
      {viewingCompanyCandidates && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#002454]/40 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            {/* Modal Header */}
            {(() => {
              const filteredCandCount = companyCandidates.filter((c) => {
                const q = candSearch.toLowerCase().trim();
                const matchesSearch = !q || c.candidate_name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.student_id?.toLowerCase().includes(q);
                const matchesPref = !candPrefFilter || String(c.preference_number) === candPrefFilter;
                const matchesSlot = !candSlotFilter || (candSlotFilter === "none" ? !c.slot_number : String(c.slot_number) === candSlotFilter);
                return matchesSearch && matchesPref && matchesSlot;
              }).length;
              const isFiltered = !!(candSearch || candPrefFilter || candSlotFilter);

              return (
                <>
                  <div className="flex items-center justify-between border-b border-[#002454]/10 bg-[#f8fcfe] px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#002454]/10 bg-white">
                        {viewingCompanyCandidates.logo_url ? (
                          <img src={viewingCompanyCandidates.logo_url} alt={viewingCompanyCandidates.name} className="h-full w-full object-contain p-1" />
                        ) : (
                          <Building2 size={20} className="text-[#002454]/40" />
                        )}
                      </div>
                      <div>
                        <h2 className="text-xl font-extrabold text-[#002454]">{viewingCompanyCandidates.name}</h2>
                        <p className="text-xs font-semibold text-[#002454]/60">
                          {isFiltered
                            ? `Showing ${filteredCandCount} of ${companyCandidates.length} candidate(s) (filtered)`
                            : `Candidates listed: ${companyCandidates.length}`}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setViewingCompanyCandidates(null)}
                      className="rounded-full p-2 text-[#002454]/50 hover:bg-[#002454]/10 hover:text-[#002454]"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Modal Search & Filters Bar */}
                  <div className="flex flex-wrap items-center gap-3 border-b border-[#002454]/10 bg-white p-4">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#002454]/40 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search name, email, student ID…"
                        value={candSearch}
                        onChange={(e) => setCandSearch(e.target.value)}
                        className="w-full rounded-xl border border-[#002454]/10 bg-white py-2 pl-9 pr-8 text-xs text-[#002454] outline-none focus:border-[#33aeda]"
                      />
                      {candSearch && (
                        <button type="button" onClick={() => setCandSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#002454]/40">
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    {/* Preference Rank Filter */}
                    <div className="relative">
                      <select
                        value={candPrefFilter}
                        onChange={(e) => setCandPrefFilter(e.target.value)}
                        className="appearance-none rounded-xl border border-[#002454]/10 bg-white py-2 pl-3 pr-7 text-xs text-[#002454] outline-none focus:border-[#33aeda]"
                      >
                        <option value="">All Preferences</option>
                        <option value="1">Preference 1</option>
                        <option value="2">Preference 2</option>
                        <option value="3">Preference 3</option>
                        <option value="4">Preference 4</option>
                      </select>
                      <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#002454]/40 pointer-events-none" />
                    </div>

                    {/* Time Slot Filter */}
                    <div className="relative">
                      <select
                        value={candSlotFilter}
                        onChange={(e) => setCandSlotFilter(e.target.value)}
                        className="appearance-none rounded-xl border border-[#002454]/10 bg-white py-2 pl-3 pr-7 text-xs text-[#002454] outline-none focus:border-[#33aeda]"
                      >
                        <option value="">All Time Slots</option>
                        <option value="1">Slot 1 (10:00 AM – 11:00 AM)</option>
                        <option value="2">Slot 2 (11:00 AM – 12:00 PM)</option>
                        <option value="3">Slot 3 (1:30 PM – 2:30 PM)</option>
                        <option value="4">Slot 4 (2:30 PM – 3:30 PM)</option>
                        <option value="none">No Time Slot Selected</option>
                      </select>
                      <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#002454]/40 pointer-events-none" />
                    </div>

                    {/* Listed Count Badge */}
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#1688b2]/10 border border-[#1688b2]/20 px-3 py-2 text-xs font-bold text-[#1688b2] shrink-0">
                      <Users size={13} />
                      {isFiltered
                        ? `Listed: ${filteredCandCount} of ${companyCandidates.length}`
                        : `Listed: ${companyCandidates.length}`}
                    </span>

                    {isFiltered && (
                      <button
                        type="button"
                        onClick={() => { setCandSearch(""); setCandPrefFilter(""); setCandSlotFilter(""); }}
                        className="flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2.5 py-2 text-xs font-bold text-red-500 hover:bg-red-100 shrink-0"
                      >
                        <X size={12} /> Clear
                      </button>
                    )}
                  </div>
                </>
              );
            })()}

            {/* Candidates Table */}
            <div className="flex-1 overflow-auto p-4">
              {loadingCandidates ? (
                <div className="flex py-12 justify-center">
                  <Loader2 className="animate-spin text-[#1688b2]" size={24} />
                </div>
              ) : companyCandidates.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#002454]/50 font-medium">
                  No candidates have selected this company yet.
                </div>
              ) : (() => {
                const filtered = companyCandidates.filter((c) => {
                  const q = candSearch.toLowerCase().trim();
                  const matchesSearch = !q || c.candidate_name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.student_id?.toLowerCase().includes(q);
                  const matchesPref = !candPrefFilter || String(c.preference_number) === candPrefFilter;
                  const matchesSlot = !candSlotFilter || (candSlotFilter === "none" ? !c.slot_number : String(c.slot_number) === candSlotFilter);
                  return matchesSearch && matchesPref && matchesSlot;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-12 text-center text-xs text-[#002454]/50 font-medium">
                      No candidates match your filters.
                    </div>
                  );
                }

                return (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f8fcfe] text-[#002454]/60">
                      <tr>
                        <th className="px-4 py-3 font-bold">Candidate</th>
                        <th className="px-4 py-3 font-bold">Student ID</th>
                        <th className="px-4 py-3 font-bold">Department</th>
                        <th className="px-4 py-3 font-bold">Preference</th>
                        <th className="px-4 py-3 font-bold">Selected Time Slot</th>
                        <th className="px-4 py-3 font-bold text-right">CV</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#002454]/5">
                      {filtered.map((cand, idx) => (
                        <tr key={idx} className="hover:bg-[#f8fcfe]/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-[#002454]">{cand.candidate_name}</div>
                            <div className="text-[11px] text-[#002454]/60">{cand.email}</div>
                          </td>
                          <td className="px-4 py-3 font-semibold text-[#002454]/80">{cand.student_id || "N/A"}</td>
                          <td className="px-4 py-3 text-[#002454]/70 max-w-[150px] truncate" title={cand.department}>{cand.department || "N/A"}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center rounded-lg bg-[#33aeda]/10 px-2 py-1 text-xs font-bold text-[#1688b2]">
                              Pref {cand.preference_number}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {cand.slot_number ? (
                              <span className="inline-flex items-center gap-1 font-bold text-[#002454]">
                                🕒 Slot {cand.slot_number}: {cand.slot_number === 1 ? "10:00 AM – 11:00 AM" : cand.slot_number === 2 ? "11:00 AM – 12:00 PM" : cand.slot_number === 3 ? "1:30 PM – 2:30 PM" : "2:30 PM – 3:30 PM"}
                              </span>
                            ) : (
                              <span className="text-[#002454]/40 italic">No slot (Pref {cand.preference_number})</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {cand.cv_url ? (
                              <a
                                href={`/api/v1/candidate/cv/${cand.candidate_id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg border border-[#1688b2]/20 bg-[#1688b2]/10 hover:bg-[#1688b2]/20 px-2 py-1 text-xs font-bold text-[#1688b2]"
                              >
                                <FileText size={13} /> View CV
                              </a>
                            ) : (
                              <span className="text-[#002454]/30">No CV</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
