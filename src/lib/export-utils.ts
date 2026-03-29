// src/lib/export-utils.ts
// Lead Export Utility

import { Lead } from '@/types';

const escapeCSV = (val: string | number | undefined | null): string => {
  const s = val == null ? '' : String(val);
  // Wrap in quotes and escape any inner quotes
  return `"${s.replace(/"/g, '""')}"`;
};

export const exportLeadsToCSV = (leads: Lead[]) => {
  if (leads.length === 0) return;

  const headers = [
    "First Name",
    "Last Name",
    "Mobile Phone",
    "Job Title",
    "Company Name",
    "Email",
    "Company Address 1: Street 1",
    "Company Address 1: State/Province",
    "Company Address 1: ZIP/Postal Code",
    "Company Address 1: Country/Region",
    "Company Address 1: City",
    "No. of Employees",
    "Direct Phone Number",
    "Email Address - Personal",
    "Email Address 2",
    "Lead Source Global",
    "Management Level",
    "SDR Name",
    "Contact Address 1: Street 1",
    "Contact Address 1: City",
    "Contact Address 1: State/Province",
    "Contact Address 1: Country/Region",
    "Contact Address 1: ZIP/Postal Code",
    "Primary Time Zone",
    "Years of Experience",
    "Contact Linkedin Url",
    "LinkedIn Summary",
    "Researcher Name",
    "Data Requester Details",
    "Company Website",
    "Company Phone",
    "Company Description",
    "Company Linkedin Url",
    "Company Industry",
    "Company Sub-Industry",
    "Parent Company",
    "Parent Company Country",
    "Segment Name",
    "Founded Year",
    "Company Revenue Range",
    "Company Employee Size Range",
    "Annual Revenue",
  ];

  const rows = leads.map(l => [
    escapeCSV(l.firstName),
    escapeCSV(l.lastName),
    escapeCSV(l.mobilePhone),
    escapeCSV(l.title),
    escapeCSV(l.companyName),
    escapeCSV(l.email),
    escapeCSV(l.companyStreet),
    escapeCSV(l.companyState),
    escapeCSV(l.companyZip),
    escapeCSV(l.companyCountry),
    escapeCSV(l.companyCity),
    escapeCSV(l.employeeCount),
    escapeCSV(l.directPhone),
    escapeCSV(l.emailPersonal),
    escapeCSV(l.email2),
    escapeCSV(l.leadSourceGlobal),
    escapeCSV(l.managementLevel),
    escapeCSV(l.sdrName),
    escapeCSV(l.contactStreet),
    escapeCSV(l.contactCity),
    escapeCSV(l.contactState),
    escapeCSV(l.contactCountry),
    escapeCSV(l.contactZip),
    escapeCSV(l.timeZone),
    escapeCSV(l.yearsOfExperience),
    escapeCSV(l.linkedinUrl),
    escapeCSV(l.linkedinSummary),
    escapeCSV(l.researcherName),
    escapeCSV(l.dataRequesterDetails),
    escapeCSV(l.companyWebsite),
    escapeCSV(l.companyPhone),
    escapeCSV(l.companyDescription),
    escapeCSV(l.companyLinkedinUrl),
    escapeCSV(l.industry),
    escapeCSV(l.subIndustry),
    escapeCSV(l.parentCompany),
    escapeCSV(l.parentCompanyCountry),
    escapeCSV(l.segmentName),
    escapeCSV(l.foundedYear),
    escapeCSV(l.revenueRange),
    escapeCSV(l.employeeSizeRange),
    escapeCSV(l.annualRevenue),
  ]);

  const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `shorthills_leads_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};