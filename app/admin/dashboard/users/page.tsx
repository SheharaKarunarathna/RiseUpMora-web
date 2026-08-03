"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, Mail, Building2, BookOpen, ChevronDown, Trash2, Search, X, SlidersHorizontal, User, Users, FileText, ListOrdered, Phone, GraduationCap, Eye } from "lucide-react";
import { departmentsByFaculty } from "@/lib/candidate-options";

type RoleType = "candidate" | "company_coordinator" | "department_coordinator" | "panelist";

export default function UserManagementPage() {
  const [activeTab, setActiveTab] = useState<RoleType>("candidate");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);

  // Candidate search & filter
  const [candidateSearch, setCandidateSearch] = useState("");
  const [filterFaculty, setFilterFaculty] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterTimeslot, setFilterTimeslot] = useState("");

  // Company coordinator search & filter
  const [coordSearch, setCoordSearch] = useState("");
  const [filterCompany, setFilterCompany] = useState("");

  // Department coordinator search & filter
  const [deptCoordSearch, setDeptCoordSearch] = useState("");
  const [filterDeptCoord, setFilterDeptCoord] = useState("");

  // Panelist search & filter
  const [panelSearch, setPanelSearch] = useState("");
  const [filterPanelCompany, setFilterPanelCompany] = useState("");
  const [filterPanelNumber, setFilterPanelNumber] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewUser, setViewUser] = useState<any>(null); // State for the View Details modal
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company_id: "",
    department: "",
  });

  const tabs = [
    { id: "candidate", label: "Candidates", icon: BookOpen },
    { id: "company_coordinator", label: "Company Co.", icon: Building2 },
    { id: "department_coordinator", label: "Dept Co.", icon: BookOpen },
    { id: "panelist", label: "Panelists", icon: Building2 },
  ];

  const departments = Object.entries(departmentsByFaculty).map(([group, options]) => ({
    group,
    options: [...options],
  }));

  useEffect(() => {
    fetchUsers(activeTab);
    // Reset all filters when switching tabs
    setCandidateSearch("");
    setFilterFaculty("");
    setFilterDept("");
    setFilterTimeslot("");
    setCoordSearch("");
    setFilterCompany("");
    setDeptCoordSearch("");
    setFilterDeptCoord("");
    setPanelSearch("");
    setFilterPanelCompany("");
    setFilterPanelNumber("");
    if (companies.length === 0) {
      fetchCompanies();
    }
  }, [activeTab]);

  const fetchUsers = async (role: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/user?role=${role}`);
      const data = await res.json();
      if (data.success) setUsers(data.users);
    } catch (error) {
      console.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await fetch("/api/v1/company/getAllCompany");
      const data = await res.json();
      if (data.success) setCompanies(data.companies);
    } catch (error) {
      console.error("Failed to fetch companies");
    }
  };

  // Faculties derived from the departments list
  const faculties = departments.map((d) => d.group);

  // Departments for selected faculty (or all if none selected)
  const deptOptions = filterFaculty
    ? (departments.find((d) => d.group === filterFaculty)?.options ?? [])
    : departments.flatMap((d) => d.options);

  // Filtered rows
  const filteredUsers = (() => {
    if (activeTab === "candidate") {
      return users.filter((u) => {
        const q = candidateSearch.toLowerCase().trim();
        const matchesSearch =
          !q ||
          u.name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.student_id?.toLowerCase().includes(q);
        const matchesFaculty = !filterFaculty || u.faculty === filterFaculty;
        const matchesDept = !filterDept || u.department === filterDept;
        const matchesTimeslot =
          !filterTimeslot ||
          (filterTimeslot === "none"
            ? !u.pref_1_timeslot && !u.pref_2_timeslot
            : String(u.pref_1_timeslot) === filterTimeslot || String(u.pref_2_timeslot) === filterTimeslot);
        return matchesSearch && matchesFaculty && matchesDept && matchesTimeslot;
      });
    }
    if (activeTab === "company_coordinator") {
      return users.filter((u) => {
        const q = coordSearch.toLowerCase().trim();
        const matchesSearch =
          !q ||
          u.name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q);
        const matchesCompany = !filterCompany || u.company_name === filterCompany;
        return matchesSearch && matchesCompany;
      });
    }
    if (activeTab === "department_coordinator") {
      return users.filter((u) => {
        const q = deptCoordSearch.toLowerCase().trim();
        const matchesSearch =
          !q ||
          u.name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q);
        const matchesDept = !filterDeptCoord || u.department === filterDeptCoord;
        return matchesSearch && matchesDept;
      });
    }
    if (activeTab === "panelist") {
      return users.filter((u) => {
        const q = panelSearch.toLowerCase().trim();
        const matchesSearch =
          !q ||
          u.name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q);
        const matchesCompany = !filterPanelCompany || u.company_name === filterPanelCompany;
        const matchesPanel = !filterPanelNumber || String(u.panel_number) === filterPanelNumber;
        return matchesSearch && matchesCompany && matchesPanel;
      });
    }
    return users;
  })();

  const hasActiveFilters =
    (activeTab === "candidate" && (candidateSearch || filterFaculty || filterDept || filterTimeslot)) ||
    (activeTab === "company_coordinator" && (coordSearch || filterCompany)) ||
    (activeTab === "department_coordinator" && (deptCoordSearch || filterDeptCoord)) ||
    (activeTab === "panelist" && (panelSearch || filterPanelCompany || filterPanelNumber));

  // Dynamic panel number options — derived from the current panelists list
  const panelNumberOptions = activeTab === "panelist"
    ? [...new Set(users.map((u) => u.panel_number).filter(Boolean))].sort((a, b) => Number(a) - Number(b))
    : [];

  const isFormValid = (() => {
    const base = formData.name.trim() !== "" && formData.email.trim() !== "";
    if (activeTab === "company_coordinator" || activeTab === "panelist") {
      return base && formData.company_id !== "";
    }
    if (activeTab === "department_coordinator") {
      return base && formData.department !== "";
    }
    return base;
  })();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, role: activeTab }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Invitation sent successfully!");
        setIsModalOpen(false);
        setFormData({ name: "", email: "", company_id: "", department: "" });
        fetchUsers(activeTab);
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/user?id=${userId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      
      if (data.success) {
        fetchUsers(activeTab);
      } else {
        alert(data.error || "Failed to delete user");
      }
    } catch (error) {
      console.error("Delete user error:", error);
      alert("An error occurred while deleting the user.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#002454]">User Management</h1>
          <p className="text-sm text-[#002454]/60">Manage roles and send invitations</p>
        </div>
        
        {activeTab !== "candidate" && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-[#f6c430] px-4 py-2.5 text-sm font-bold text-[#002454] transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <Plus size={18} />
            Invite {tabs.find(t => t.id === activeTab)?.label}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="inline-flex rounded-xl bg-[#002454]/5 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as RoleType)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all ${
              activeTab === tab.id
                ? "bg-white text-[#002454] shadow-sm"
                : "text-[#002454]/60 hover:text-[#002454]"
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Candidate search & filters */}
      {activeTab === "candidate" && (
        <div className="flex flex-wrap items-center gap-3">
          {/* Text search */}
          <div className="relative min-w-[220px] flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#002454]/40 pointer-events-none" />
            <input
              type="text"
              placeholder="Search name, email, student ID…"
              value={candidateSearch}
              onChange={(e) => setCandidateSearch(e.target.value)}
              className="w-full rounded-xl border border-[#002454]/10 bg-white py-2.5 pl-10 pr-9 text-sm text-[#002454] outline-none transition-all focus:border-[#33aeda] focus:ring-2 focus:ring-[#33aeda]/10"
            />
            {candidateSearch && (
              <button type="button" onClick={() => setCandidateSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#002454]/40 hover:text-[#002454]/70">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Faculty filter */}
          <div className="relative">
            <SlidersHorizontal size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#002454]/40 pointer-events-none" />
            <select
              value={filterFaculty}
              onChange={(e) => { setFilterFaculty(e.target.value); setFilterDept(""); }}
              className="appearance-none rounded-xl border border-[#002454]/10 bg-white py-2.5 pl-8 pr-8 text-sm text-[#002454] outline-none transition-all focus:border-[#33aeda] focus:ring-2 focus:ring-[#33aeda]/10"
            >
              <option value="">All Faculties</option>
              {faculties.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#002454]/40 pointer-events-none" />
          </div>

          {/* Department filter */}
          <div className="relative">
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              disabled={deptOptions.length === 0}
              className="appearance-none rounded-xl border border-[#002454]/10 bg-white py-2.5 pl-4 pr-8 text-sm text-[#002454] outline-none transition-all focus:border-[#33aeda] focus:ring-2 focus:ring-[#33aeda]/10 disabled:opacity-40"
            >
              <option value="">All Departments</option>
              {deptOptions.map((d) => (
                <option key={d} value={d}>{d.split(" – ")[1] || d}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#002454]/40 pointer-events-none" />
          </div>

          {/* Time slot filter */}
          <div className="relative">
            <select
              value={filterTimeslot}
              onChange={(e) => setFilterTimeslot(e.target.value)}
              className="appearance-none rounded-xl border border-[#002454]/10 bg-white py-2.5 pl-4 pr-8 text-sm text-[#002454] outline-none transition-all focus:border-[#33aeda] focus:ring-2 focus:ring-[#33aeda]/10"
            >
              <option value="">All Time Slots</option>
              <option value="1">Slot 1 (10:00 AM – 11:00 AM)</option>
              <option value="2">Slot 2 (11:00 AM – 12:00 PM)</option>
              <option value="3">Slot 3 (1:30 PM – 2:30 PM)</option>
              <option value="4">Slot 4 (2:30 PM – 3:30 PM)</option>
              <option value="none">No Time Slot Selected</option>
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#002454]/40 pointer-events-none" />
          </div>

          {/* Listed Candidates Count Badge */}
          <div className="inline-flex items-center gap-1.5 rounded-xl bg-[#1688b2]/10 border border-[#1688b2]/20 px-3.5 py-2.5 text-xs font-bold text-[#1688b2] shrink-0">
            <Users size={14} />
            {hasActiveFilters
              ? `Listed: ${filteredUsers.length} of ${users.length}`
              : `Listed: ${users.length} candidates`}
          </div>

          {/* Clear all filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => { setCandidateSearch(""); setFilterFaculty(""); setFilterDept(""); setFilterTimeslot(""); }}
              className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-bold text-red-500 transition-colors hover:bg-red-100"
            >
              <X size={13} /> Clear filters
            </button>
          )}
        </div>
      )}

      {/* Company Coordinator search & filters */}
      {activeTab === "company_coordinator" && (
        <div className="flex flex-wrap items-center gap-3">
          {/* Text search */}
          <div className="relative min-w-[220px] flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#002454]/40 pointer-events-none" />
            <input
              type="text"
              placeholder="Search name or email…"
              value={coordSearch}
              onChange={(e) => setCoordSearch(e.target.value)}
              className="w-full rounded-xl border border-[#002454]/10 bg-white py-2.5 pl-10 pr-9 text-sm text-[#002454] outline-none transition-all focus:border-[#33aeda] focus:ring-2 focus:ring-[#33aeda]/10"
            />
            {coordSearch && (
              <button type="button" onClick={() => setCoordSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#002454]/40 hover:text-[#002454]/70">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Company filter — dynamic from fetched companies */}
          <div className="relative">
            <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#002454]/40 pointer-events-none" />
            <select
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              className="appearance-none rounded-xl border border-[#002454]/10 bg-white py-2.5 pl-8 pr-8 text-sm text-[#002454] outline-none transition-all focus:border-[#33aeda] focus:ring-2 focus:ring-[#33aeda]/10"
            >
              <option value="">All Companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#002454]/40 pointer-events-none" />
          </div>

          {/* Clear filters */}
          {(coordSearch || filterCompany) && (
            <button
              type="button"
              onClick={() => { setCoordSearch(""); setFilterCompany(""); }}
              className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-bold text-red-500 transition-colors hover:bg-red-100"
            >
              <X size={13} /> Clear filters
            </button>
          )}
        </div>
      )}

      {/* Department Coordinator search & filters */}
      {activeTab === "department_coordinator" && (
        <div className="flex flex-wrap items-center gap-3">
          {/* Text search */}
          <div className="relative min-w-[220px] flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#002454]/40 pointer-events-none" />
            <input
              type="text"
              placeholder="Search name or email…"
              value={deptCoordSearch}
              onChange={(e) => setDeptCoordSearch(e.target.value)}
              className="w-full rounded-xl border border-[#002454]/10 bg-white py-2.5 pl-10 pr-9 text-sm text-[#002454] outline-none transition-all focus:border-[#33aeda] focus:ring-2 focus:ring-[#33aeda]/10"
            />
            {deptCoordSearch && (
              <button type="button" onClick={() => setDeptCoordSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#002454]/40 hover:text-[#002454]/70">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Department filter — grouped by faculty */}
          <div className="relative">
            <BookOpen size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#002454]/40 pointer-events-none" />
            <select
              value={filterDeptCoord}
              onChange={(e) => setFilterDeptCoord(e.target.value)}
              className="appearance-none rounded-xl border border-[#002454]/10 bg-white py-2.5 pl-8 pr-8 text-sm text-[#002454] outline-none transition-all focus:border-[#33aeda] focus:ring-2 focus:ring-[#33aeda]/10"
            >
              <option value="">All Departments</option>
              {departments.map((group) => (
                <optgroup key={group.group} label={group.group}>
                  {group.options.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#002454]/40 pointer-events-none" />
          </div>

          {/* Clear filters */}
          {(deptCoordSearch || filterDeptCoord) && (
            <button
              type="button"
              onClick={() => { setDeptCoordSearch(""); setFilterDeptCoord(""); }}
              className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-bold text-red-500 transition-colors hover:bg-red-100"
            >
              <X size={13} /> Clear filters
            </button>
          )}
        </div>
      )}

      {/* Panelist search & filters */}
      {activeTab === "panelist" && (
        <div className="flex flex-wrap items-center gap-3">
          {/* Text search */}
          <div className="relative min-w-[220px] flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#002454]/40 pointer-events-none" />
            <input
              type="text"
              placeholder="Search name or email…"
              value={panelSearch}
              onChange={(e) => setPanelSearch(e.target.value)}
              className="w-full rounded-xl border border-[#002454]/10 bg-white py-2.5 pl-10 pr-9 text-sm text-[#002454] outline-none transition-all focus:border-[#33aeda] focus:ring-2 focus:ring-[#33aeda]/10"
            />
            {panelSearch && (
              <button type="button" onClick={() => setPanelSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#002454]/40 hover:text-[#002454]/70">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Company filter — dynamic from fetched companies */}
          <div className="relative">
            <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#002454]/40 pointer-events-none" />
            <select
              value={filterPanelCompany}
              onChange={(e) => setFilterPanelCompany(e.target.value)}
              className="appearance-none rounded-xl border border-[#002454]/10 bg-white py-2.5 pl-8 pr-8 text-sm text-[#002454] outline-none transition-all focus:border-[#33aeda] focus:ring-2 focus:ring-[#33aeda]/10"
            >
              <option value="">All Companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#002454]/40 pointer-events-none" />
          </div>

          {/* Panel number filter — dynamic from fetched panelists */}
          <div className="relative">
            <SlidersHorizontal size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#002454]/40 pointer-events-none" />
            <select
              value={filterPanelNumber}
              onChange={(e) => setFilterPanelNumber(e.target.value)}
              disabled={panelNumberOptions.length === 0}
              className="appearance-none rounded-xl border border-[#002454]/10 bg-white py-2.5 pl-8 pr-8 text-sm text-[#002454] outline-none transition-all focus:border-[#33aeda] focus:ring-2 focus:ring-[#33aeda]/10 disabled:opacity-40"
            >
              <option value="">All Panels</option>
              {panelNumberOptions.map((n) => (
                <option key={n} value={String(n)}>Panel {n}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#002454]/40 pointer-events-none" />
          </div>

          {/* Clear filters */}
          {(panelSearch || filterPanelCompany || filterPanelNumber) && (
            <button
              type="button"
              onClick={() => { setPanelSearch(""); setFilterPanelCompany(""); setFilterPanelNumber(""); }}
              className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-bold text-red-500 transition-colors hover:bg-red-100"
            >
              <X size={13} /> Clear filters
            </button>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-[#002454]/10 bg-white shadow-sm">
        <div style={{ maxHeight: '400px' }} className="overflow-auto w-full">
          <table className="w-full text-left text-base whitespace-nowrap relative">
            <thead className="sticky top-0 z-10 bg-[#f8fcfe] text-[#002454]/60 shadow-[0_1px_0_0_rgba(0,36,84,0.05)]">
              <tr>
                <th className="px-5 py-3 font-bold">Name</th>
                <th className="px-5 py-3 font-bold">Email</th>
                {activeTab === "candidate" && (
                  <>
                    <th className="px-5 py-3 font-bold">Student ID</th>
                    <th className="px-5 py-3 font-bold">Faculty</th>
                    <th className="px-5 py-3 font-bold">Department</th>
                  </>
                )}
                {(activeTab === "company_coordinator" || activeTab === "panelist") && (
                  <th className="px-5 py-3 font-bold">Company</th>
                )}
                {activeTab === "department_coordinator" && (
                  <th className="px-5 py-3 font-bold">Department</th>
                )}
                {activeTab === "panelist" && (
                  <th className="px-5 py-3 font-bold">Panel #</th>
                )}
                {activeTab !== "candidate" && (
                  <th className="px-5 py-3 font-bold">Status</th>
                )}
                <th className="px-5 py-3 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#002454]/5">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-[#002454]/50">
                    <Loader2 className="mx-auto animate-spin" size={24} />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-[#002454]/50">
                    {hasActiveFilters
                      ? "No candidates match your search or filters."
                      : "No users found for this role."}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, idx) => (
                  <tr key={idx} className="transition-colors hover:bg-[#f8fcfe]/50">
                    <td className="px-5 py-3 font-bold text-[#002454] max-w-[150px] sm:max-w-[200px] truncate" title={user.name}>{user.name}</td>
                    <td className="px-5 py-3 text-[#002454]/70 max-w-[150px] sm:max-w-[200px] truncate" title={user.email}>{user.email}</td>
                    {activeTab === "candidate" && (
                      <>
                        <td className="px-5 py-3 text-[#002454]/70">{user.student_id}</td>
                        <td className="px-5 py-3 text-[#002454]/70 max-w-[150px] sm:max-w-[200px] truncate" title={user.faculty}>{user.faculty}</td>
                        <td className="px-5 py-3 text-[#002454]/70 max-w-[150px] sm:max-w-[250px] truncate" title={user.department}>{user.department}</td>
                      </>
                    )}
                    {(activeTab === "company_coordinator" || activeTab === "panelist") && (
                      <td className="px-5 py-3 text-[#002454]/70 max-w-[150px] sm:max-w-[200px] truncate" title={user.company_name}>{user.company_name}</td>
                    )}
                    {activeTab === "department_coordinator" && (
                      <td className="px-5 py-3 text-[#002454]/70 max-w-[150px] sm:max-w-[250px] truncate" title={user.department}>{user.department}</td>
                    )}
                    {activeTab === "panelist" && (
                      <td className="px-5 py-3 text-[#002454]/70">{user.panel_number}</td>
                    )}
                    {activeTab !== "candidate" && (
                      <td className="px-5 py-3">
                        {user.email_verified_at ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-bold text-yellow-700">
                            Pending
                          </span>
                        )}
                      </td>
                    )}
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {activeTab === "candidate" && (
                          <button
                            onClick={() => setViewUser(user)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#33aeda]/20 bg-[#33aeda]/10 hover:bg-[#33aeda]/20 px-2.5 py-1 text-xs font-bold text-[#1688b2] transition-colors"
                            title="View Candidate Profile"
                          >
                            <Eye size={14} /> Profile
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteUser(user.user_id)}
                          className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50"
                          title="Delete User"
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

      {/* Invite Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#002454]/20 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-6 text-xl font-extrabold text-[#002454]">
              Invite {tabs.find(t => t.id === activeTab)?.label}
            </h2>
            <form onSubmit={handleInvite} className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-bold text-[#002454]">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full rounded-xl border border-[#002454]/10 bg-white px-4 py-2.5 text-[#002454] outline-none focus:border-[#33aeda] focus:ring-2 focus:ring-[#33aeda]/10"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-bold text-[#002454]">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#002454]/40" size={18} />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full rounded-xl border border-[#002454]/10 bg-white py-2.5 pl-10 pr-4 text-[#002454] outline-none focus:border-[#33aeda] focus:ring-2 focus:ring-[#33aeda]/10"
                    required
                  />
                </div>
              </div>

              {(activeTab === "company_coordinator" || activeTab === "panelist") && (
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-[#002454]">Assign Company</label>
                  <select
                    value={formData.company_id}
                    onChange={e => setFormData({...formData, company_id: e.target.value})}
                    className="w-full rounded-xl border border-[#002454]/10 bg-white px-4 py-2.5 text-[#002454] outline-none focus:border-[#33aeda] focus:ring-2 focus:ring-[#33aeda]/10"
                    required
                  >
                    <option value="" disabled>Select a company</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {activeTab === "department_coordinator" && (
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-[#002454]">Department Name</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsDeptDropdownOpen(!isDeptDropdownOpen)}
                      className="flex w-full items-center justify-between rounded-xl border border-[#002454]/10 bg-white px-4 py-2.5 text-left text-[#002454] outline-none focus:border-[#33aeda] focus:ring-2 focus:ring-[#33aeda]/10"
                    >
                      <span className={formData.department ? "truncate text-[#002454]" : "text-[#002454]/60"}>
                        {formData.department ? formData.department.split(" – ")[1] || formData.department : "Select a department"}
                      </span>
                      <ChevronDown size={16} className={`transition-transform ${isDeptDropdownOpen ? "rotate-180" : ""}`} />
                    </button>

                    {isDeptDropdownOpen && (
                      <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-[#002454]/10 bg-white p-2 shadow-xl">
                        {departments.map((group, idx) => (
                          <div key={idx} className="mb-2 last:mb-0">
                            <div className="px-3 py-1.5 text-xs font-extrabold uppercase text-[#002454]/50">
                              {group.group}
                            </div>
                            {group.options.map(opt => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, department: opt });
                                  setIsDeptDropdownOpen(false);
                                }}
                                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-[#f8fcfe] ${formData.department === opt ? "bg-[#f8fcfe] font-bold text-[#002454]" : "text-[#002454]/80"}`}
                              >
                                {opt.split(" – ")[1] || opt}
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
                  disabled={isSubmitting || !isFormValid}
                  className={`flex items-center justify-center rounded-xl bg-[#f6c430] px-4 py-2.5 text-sm font-bold text-[#002454] transition-all hover:shadow-lg disabled:opacity-50 ${
                    isFormValid ? "opacity-100" : "pointer-events-none opacity-0"
                  }`}
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : "Send Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* View User Modal */}
      {viewUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#002454]/40 p-4 backdrop-blur-sm transition-all duration-300">
          <div className="w-full max-w-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header Cover */}
            <div className="shrink-0 bg-gradient-to-r from-[#002454] to-[#003b8c] px-6 sm:px-8 py-6 sm:py-8 relative">
              <button
                onClick={() => setViewUser(null)}
                className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
              >
                <X size={20} />
              </button>
              <div className="flex items-center gap-5">
                <div className="flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center rounded-2xl border-2 border-white/20 bg-white/10 backdrop-blur-sm">
                  <User size={36} className="text-white/70 sm:w-10 sm:h-10 w-8 h-8" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl sm:text-2xl font-black text-white truncate">{viewUser.name}</h2>
                  <div className="mt-2 flex flex-col gap-1.5 text-sm">
                    <div className="flex items-center gap-2 text-white/70">
                      <Mail size={14} className="shrink-0" />
                      <span className="truncate">{viewUser.email}</span>
                    </div>
                    {viewUser.contact_number && (
                      <div className="flex items-center gap-2 text-white/70">
                        <Phone size={14} className="shrink-0" />
                        <span>{viewUser.contact_number}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 sm:px-8 pb-8 pt-6 sm:pt-8">

              <div className="grid gap-6 md:grid-cols-2">
                {/* Left Column: Academic Info + CV */}
                <div className="space-y-6">
                  {/* Academic Info */}
                  <div className="rounded-2xl border border-[#002454]/10 bg-[#f8fcfe] p-5">
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-[#002454]/50">
                      <GraduationCap size={16} /> Academic Profile
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <span className="block text-xs font-bold text-[#002454]/40">Student ID</span>
                        <span className="font-medium text-[#002454]">{viewUser.student_id || "N/A"}</span>
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-[#002454]/40">Faculty</span>
                        <span className="font-medium text-[#002454]">{viewUser.faculty || "N/A"}</span>
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-[#002454]/40">Department</span>
                        <span className="font-medium text-[#002454]">{viewUser.department || "N/A"}</span>
                      </div>
                    </div>
                  </div>

                  {/* CV Section */}
                  <div className="rounded-2xl border border-[#002454]/10 bg-white p-5 shadow-sm">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-[#002454]/50">
                      <FileText size={16} /> Resume / CV
                    </h3>
                    {viewUser.cv_url ? (
                      <a
                        href={`/api/v1/candidate/cv/${viewUser.candidate_id || viewUser.user_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-center justify-between rounded-xl border border-green-200 bg-green-50 p-3 transition-colors hover:bg-green-100"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-200 text-green-700">
                            <FileText size={20} />
                          </div>
                          <div>
                            <span className="block text-sm font-bold text-green-900">View Document</span>
                            <span className="block text-xs text-green-700">Opens in new tab</span>
                          </div>
                        </div>
                      </a>
                    ) : (
                      <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-500">
                          <FileText size={20} />
                        </div>
                        <div>
                          <span className="block text-sm font-bold text-red-800">Not Uploaded</span>
                          <span className="block text-xs text-red-600">Candidate hasn't provided a CV</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Company Preferences */}
                <div className="rounded-2xl border border-[#002454]/10 bg-white p-5 shadow-sm">
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-[#002454]/50">
                    <ListOrdered size={16} /> Company Preferences & Time Slots
                  </h3>
                  {[
                    { name: viewUser.pref_1_name || (companies.find(c => c.id === viewUser.pref_1)?.name), slot: viewUser.pref_1_timeslot },
                    { name: viewUser.pref_2_name || (companies.find(c => c.id === viewUser.pref_2)?.name), slot: viewUser.pref_2_timeslot },
                    { name: viewUser.pref_3_name || (companies.find(c => c.id === viewUser.pref_3)?.name), slot: null },
                    { name: viewUser.pref_4_name || (companies.find(c => c.id === viewUser.pref_4)?.name), slot: null },
                  ].some(p => Boolean(p.name)) ? (
                    <div className="space-y-2.5">
                      {[
                        { name: viewUser.pref_1_name || (companies.find(c => c.id === viewUser.pref_1)?.name), slot: viewUser.pref_1_timeslot },
                        { name: viewUser.pref_2_name || (companies.find(c => c.id === viewUser.pref_2)?.name), slot: viewUser.pref_2_timeslot },
                        { name: viewUser.pref_3_name || (companies.find(c => c.id === viewUser.pref_3)?.name), slot: null },
                        { name: viewUser.pref_4_name || (companies.find(c => c.id === viewUser.pref_4)?.name), slot: null },
                      ]
                        .map((pref, i) => pref.name ? (
                          <div key={i} className="flex flex-col gap-1.5 rounded-xl border border-[#002454]/5 bg-[#f8fcfe] p-3">
                            <div className="flex items-center gap-3">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#33aeda]/10 text-xs font-black text-[#33aeda]">
                                {i + 1}
                              </span>
                              <span className="text-sm font-bold text-[#002454]">
                                {pref.name}
                              </span>
                            </div>
                            {(i === 0 || i === 1) && (
                              <div className="ml-10 text-xs font-semibold">
                                {pref.slot ? (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-[#1688b2]/10 px-2 py-0.5 text-[#1688b2]">
                                    🕒 Slot {pref.slot}: {pref.slot === 1 ? "10:00 AM – 11:00 AM" : pref.slot === 2 ? "11:00 AM – 12:00 PM" : pref.slot === 3 ? "1:30 PM – 2:30 PM" : "2:30 PM – 3:30 PM"}
                                  </span>
                                ) : (
                                  <span className="text-amber-600 italic">No time slot selected</span>
                                )}
                              </div>
                            )}
                          </div>
                        ) : null)}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-[#002454]/20 bg-[#f8fcfe] p-4 text-center">
                      <span className="text-sm font-medium italic text-[#002454]/40">No preferences submitted</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
