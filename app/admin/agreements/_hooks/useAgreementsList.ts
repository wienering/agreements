'use client';

import { adminFetch } from '@/lib/adminFetch';
import { useEffect, useMemo, useRef, useState } from 'react';
import { filterAgreements } from '../_components/agreementUtils';
import { ITEMS_PER_PAGE, type Agreement, type BackdropLinkOption, type ClientOption, type TemplateOption, type WarningData } from '../_components/types';

export function useAgreementsList() {
  const hasFetchedData = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [attendantFilter, setAttendantFilter] = useState('ALL');
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [warningData, setWarningData] = useState<WarningData | null>(null);
  const [backdropLinks, setBackdropLinks] = useState<BackdropLinkOption[]>([]);
  const [activePage, setActivePage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(() => new Set());

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    if (hasFetchedData.current) return;
    hasFetchedData.current = true;

    const load = async () => {
      try {
        const response = await adminFetch('/api/agreements?slim=1');
        if (response.ok) setAgreements(await response.json());
      } catch (error) {
        console.error('Error fetching agreements:', error);
      }
    };
    const loadLinks = async () => {
      try {
        const response = await adminFetch('/api/agreements/backdrop-links');
        if (response.ok) {
          const data = await response.json();
          setBackdropLinks(data.backdropLinks || []);
        }
      } catch (error) {
        console.error('Error fetching backdrop links:', error);
      }
    };
    const loadClients = async () => {
      try {
        const response = await adminFetch('/api/clients');
        if (response.ok) setClients(await response.json());
      } catch (error) {
        console.error('Error fetching clients:', error);
      }
    };
    const loadTemplates = async () => {
      try {
        const response = await adminFetch('/api/templates');
        if (response.ok) setTemplates(await response.json());
      } catch (error) {
        console.error('Error fetching templates:', error);
      }
    };
    const loadWarnings = async () => {
      try {
        const response = await adminFetch('/api/analytics/warnings');
        if (response.ok) setWarningData(await response.json());
      } catch (error) {
        console.error('Error fetching warning data:', error);
      }
    };

    load();
    loadClients();
    loadTemplates();
    loadWarnings();
    loadLinks();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setActivePage(1);
    setCompletedPage(1);
  }, [debouncedSearchTerm, statusFilter, attendantFilter]);

  const replaceAgreement = (next: Agreement) => {
    setAgreements((prev) => prev.map((agreement) => (agreement.id === next.id ? { ...agreement, ...next } : agreement)));
  };

  const prependAgreement = (created: Agreement) => {
    setAgreements((prev) => [{ ...created, unreadNotesCount: created.unreadNotesCount ?? 0 }, ...prev]);
  };

  const removeAgreement = (id: string) => {
    setAgreements((prev) => prev.filter((agreement) => agreement.id !== id));
  };

  const filteredAgreements = useMemo(
    () => filterAgreements(agreements, statusFilter, attendantFilter, debouncedSearchTerm),
    [agreements, debouncedSearchTerm, statusFilter, attendantFilter],
  );

  const activeAgreements = useMemo(
    () => filteredAgreements.filter((agreement) => agreement.status !== 'COMPLETED'),
    [filteredAgreements],
  );
  const completedAgreements = useMemo(
    () => filteredAgreements.filter((agreement) => agreement.status === 'COMPLETED'),
    [filteredAgreements],
  );

  const activeTotalPages = Math.ceil(activeAgreements.length / ITEMS_PER_PAGE);
  const paginatedActive = activeAgreements.slice((activePage - 1) * ITEMS_PER_PAGE, activePage * ITEMS_PER_PAGE);
  const completedTotalPages = Math.ceil(completedAgreements.length / ITEMS_PER_PAGE);
  const paginatedCompleted = completedAgreements.slice(
    (completedPage - 1) * ITEMS_PER_PAGE,
    completedPage * ITEMS_PER_PAGE,
  );

  const getAgreementWarningType = (agreement: Agreement) => {
    if (!warningData) return null;
    return warningData.warnings.find((warning) => warning.id === agreement.id)?.warningType || null;
  };

  return {
    agreements,
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,
    statusFilter,
    setStatusFilter,
    attendantFilter,
    setAttendantFilter,
    clients,
    templates,
    backdropLinks,
    searchInputRef,
    activePage,
    setActivePage,
    completedPage,
    setCompletedPage,
    completedExpanded,
    setCompletedExpanded,
    expandedRows,
    toggleRow,
    filteredAgreements,
    activeAgreements,
    completedAgreements,
    activeTotalPages,
    paginatedActive,
    completedTotalPages,
    paginatedCompleted,
    getAgreementWarningType,
    replaceAgreement,
    prependAgreement,
    removeAgreement,
  };
}
