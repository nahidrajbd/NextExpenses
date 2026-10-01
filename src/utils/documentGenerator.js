import { jsPDF } from 'jspdf';

export const COMPANY = {
  name: 'NextPost Media',
  address: 'House 12, Road 5, Gulshan, Dhaka-1212, Bangladesh',
  phone: '+880 1700-000000',
  email: 'hr@nextpostmedia.com',
  website: 'www.nextpostmedia.com'
};

const todayStr = () => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

function letterhead(doc, title) {
  doc.setFillColor(101, 178, 232);
  doc.rect(0, 0, 210, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(COMPANY.name, 14, 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`${COMPANY.address}  |  ${COMPANY.phone}  |  ${COMPANY.email}`, 14, 19);

  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(title, 105, 35, { align: 'center' });
  doc.setDrawColor(101, 178, 232);
  doc.setLineWidth(0.6);
  doc.line(70, 38, 140, 38);

  return 50; // starting Y for body content
}

function footer(doc) {
  doc.setDrawColor(220, 220, 220);
  doc.line(14, 280, 196, 280);
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`${COMPANY.name}  •  ${COMPANY.website}`, 105, 286, { align: 'center' });
}

function bodyText(doc, y, lines, options = {}) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(options.fontSize || 11);
  doc.setTextColor(30, 30, 30);
  const wrapped = doc.splitTextToSize(lines, options.width || 182);
  doc.text(wrapped, 14, y, { lineHeightFactor: 1.6 });
  return y + wrapped.length * (options.lineHeight || 6.5) + 6;
}

function refBlock(doc, y, emp) {
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  doc.text(`Ref: ${emp.employeeCode || emp.id?.slice(0, 8) || 'N/A'}`, 14, y);
  doc.text(`Date: ${todayStr()}`, 196, y, { align: 'right' });
  return y + 10;
}

export function generateAppointmentLetter(emp) {
  const doc = new jsPDF();
  let y = letterhead(doc, 'APPOINTMENT LETTER');
  y = refBlock(doc, y, emp);

  y = bodyText(doc, y, `Dear ${emp.name},`);
  y = bodyText(doc, y,
    `We are pleased to offer you the position of ${emp.designation || 'Staff Member'} in the ${emp.department || 'General'} Department at ${COMPANY.name}, effective from ${emp.dateJoined || todayStr()}. This letter confirms the terms of your appointment as an ${emp.employmentType || 'Full-Time'} employee of the organization.`
  );
  y = bodyText(doc, y,
    `Your employment will be governed by the policies, rules, and regulations of ${COMPANY.name}, as amended from time to time. You are expected to maintain the highest standards of professionalism, integrity, and confidentiality in the performance of your duties.`
  );
  y = bodyText(doc, y,
    `Your compensation and benefits will be communicated to you separately and are subject to periodic review as per company policy. This appointment may be terminated by either party by providing written notice as per the terms of the employee handbook.`
  );
  y = bodyText(doc, y,
    `We warmly welcome you to the team and look forward to a long and productive association with you.`
  );

  y += 12;
  doc.setFont('helvetica', 'bold');
  doc.text('For ' + COMPANY.name, 14, y);
  y += 18;
  doc.text('Authorized Signatory', 14, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Human Resources Department', 14, y + 5);

  footer(doc);
  doc.save(`Appointment_Letter_${emp.name.replace(/\s+/g, '_')}.pdf`);
}

export function generateNOCLetter(emp, purpose = 'Visa Application') {
  const doc = new jsPDF();
  let y = letterhead(doc, 'NO OBJECTION CERTIFICATE');
  y = refBlock(doc, y, emp);

  y = bodyText(doc, y, `To Whom It May Concern,`);
  y = bodyText(doc, y,
    `This is to certify that ${emp.name}, holding Employee ID ${emp.employeeCode || 'N/A'}, is currently employed with ${COMPANY.name} as ${emp.designation || 'a Staff Member'} in the ${emp.department || 'General'} Department since ${emp.dateJoined || 'N/A'}.`
  );
  y = bodyText(doc, y,
    `${COMPANY.name} has no objection to ${emp.name} applying for the purpose of ${purpose}. We confirm that the organization has no objection to the individual's travel/personal matter as stated, and this employee remains in good standing with the company.`
  );
  y = bodyText(doc, y,
    `This certificate is issued upon the request of the employee for the intended purpose only and does not constitute any financial liability or guarantee on behalf of ${COMPANY.name}.`
  );

  y += 12;
  doc.setFont('helvetica', 'bold');
  doc.text('For ' + COMPANY.name, 14, y);
  y += 18;
  doc.text('Authorized Signatory', 14, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Human Resources Department', 14, y + 5);

  footer(doc);
  doc.save(`NOC_Letter_${emp.name.replace(/\s+/g, '_')}.pdf`);
}

export function generateExperienceLetter(emp) {
  const doc = new jsPDF();
  let y = letterhead(doc, 'EXPERIENCE CERTIFICATE');
  y = refBlock(doc, y, emp);

  y = bodyText(doc, y, `To Whom It May Concern,`);
  y = bodyText(doc, y,
    `This is to certify that ${emp.name} worked with ${COMPANY.name} as ${emp.designation || 'a Staff Member'} in the ${emp.department || 'General'} Department from ${emp.dateJoined || 'N/A'} to ${emp.dateLeft || todayStr()}.`
  );
  y = bodyText(doc, y,
    `During the tenure with our organization, ${emp.name.split(' ')[0]} demonstrated strong professional skills, sincerity, and dedication towards assigned responsibilities. Their conduct throughout the employment period was found to be satisfactory and in accordance with company standards.`
  );
  y = bodyText(doc, y,
    `We wish ${emp.name.split(' ')[0]} continued success in all future professional endeavors.`
  );

  y += 12;
  doc.setFont('helvetica', 'bold');
  doc.text('For ' + COMPANY.name, 14, y);
  y += 18;
  doc.text('Authorized Signatory', 14, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Human Resources Department', 14, y + 5);

  footer(doc);
  doc.save(`Experience_Letter_${emp.name.replace(/\s+/g, '_')}.pdf`);
}

// Standard CR80 card size in mm: 85.6 x 54
export function generateIDCard(emp) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [54, 85.6] });

  // Front side
  doc.setFillColor(101, 178, 232);
  doc.rect(0, 0, 54, 85.6, 'F');
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(3, 3, 48, 79.6, 3, 3, 'F');

  doc.setFillColor(101, 178, 232);
  doc.rect(3, 3, 48, 14, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(COMPANY.name, 27, 8, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text('EMPLOYEE IDENTITY CARD', 27, 13, { align: 'center' });

  // Photo box
  doc.setDrawColor(101, 178, 232);
  doc.setLineWidth(0.5);
  doc.rect(19, 20, 16, 16);
  if (emp.photoURL) {
    try { doc.addImage(emp.photoURL, 'JPEG', 19, 20, 16, 16); } catch (e) { /* ignore invalid image */ }
  }

  doc.setTextColor(20, 20, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(emp.name, 27, 40, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(emp.designation || 'Staff Member', 27, 44.5, { align: 'center' });

  doc.setFontSize(6.3);
  doc.setTextColor(60, 60, 60);
  let ly = 50;
  const line = (label, value) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, 6, ly);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value || 'N/A'), 20, ly);
    ly += 4.3;
  };
  line('ID', emp.employeeCode || emp.id?.slice(0, 8));
  line('Dept', emp.department);
  line('Blood', emp.bloodGroup);
  line('Phone', emp.phone);
  line('Joined', emp.dateJoined);

  doc.setDrawColor(101, 178, 232);
  doc.line(6, 74, 48, 74);
  doc.setFontSize(5.8);
  doc.setTextColor(90, 90, 90);
  doc.text('If found, please return to:', 27, 77.5, { align: 'center' });
  doc.text(COMPANY.phone, 27, 80.5, { align: 'center' });

  doc.save(`ID_Card_${emp.name.replace(/\s+/g, '_')}.pdf`);
}

// Standard business card size in mm: 90 x 54
export function generateVisitingCard(emp) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [54, 90] });

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 90, 54, 'F');
  doc.setFillColor(101, 178, 232);
  doc.rect(0, 0, 32, 54, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(COMPANY.name.split(' ')[0], 16, 24, { align: 'center' });
  doc.setFontSize(9);
  doc.text(COMPANY.name.split(' ').slice(1).join(' '), 16, 30, { align: 'center' });

  doc.setTextColor(20, 20, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.text(emp.name, 38, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(101, 178, 232);
  doc.text(emp.designation || 'Staff Member', 38, 24);

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(7.2);
  doc.text(`P: ${emp.phone || 'N/A'}`, 38, 33);
  doc.text(`E: ${emp.email || 'N/A'}`, 38, 38);
  doc.text(`W: ${COMPANY.website}`, 38, 43);
  doc.text(COMPANY.address, 38, 48, { maxWidth: 48 });

  doc.save(`Visiting_Card_${emp.name.replace(/\s+/g, '_')}.pdf`);
}


// --- A4 Employee Information Sheet ---
export function generateEmployeeInfoSheet(emp) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const ML = 14;
  const MR = 14;
  const CW = W - ML - MR;

  // Simple text header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 30, 30);
  doc.text(COMPANY.name, ML, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 100);
  doc.text(`${COMPANY.address}  |  ${COMPANY.phone}  |  ${COMPANY.email}`, ML, 24);

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.4);
  doc.line(ML, 27, W - MR, 27);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text('EMPLOYEE INFORMATION SHEET', W / 2, 34, { align: 'center' });

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(ML, 37, W - MR, 37);

  // Photo box
  const photoSize = 32;
  const photoX = W - MR - photoSize;
  const photoY = 41;

  doc.setDrawColor(160, 160, 160);
  doc.setLineWidth(0.4);
  doc.rect(photoX, photoY, photoSize, photoSize);

  if (emp.photoURL) {
    try { doc.addImage(emp.photoURL, 'JPEG', photoX, photoY, photoSize, photoSize); } catch (e) { /* ignore */ }
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text('Photo', photoX + photoSize / 2, photoY + photoSize / 2 + 1.5, { align: 'center' });
  }

  // Name & identity block
  let y = 46;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text(emp.name || 'N/A', ML, y);

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(
    `${emp.designation || 'Staff Member'}${emp.department ? '  |  ' + emp.department : ''}  |  ID: ${emp.employeeCode || 'N/A'}`,
    ML, y
  );

  y += 5;
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 100);
  doc.text(`Status: ${emp.status || 'N/A'}   |   Type: ${emp.employmentType || 'N/A'}   |   Joined: ${emp.dateJoined || 'N/A'}`, ML, y);

  y += 4;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(ML, y, photoX - 4, y);
  y += 8;

  // Table helpers
  const ROW_H  = 9;
  const COL1_W = 52;
  const halfW  = CW / 2;

  const dottedLine = (x1, yy, x2) => {
    doc.setDrawColor(190, 190, 190);
    doc.setLineWidth(0.25);
    doc.setLineDashPattern([0.8, 1.2], 0);
    doc.line(x1, yy, x2, yy);
    doc.setLineDashPattern([], 0);
  };

  const sectionHeading = (title, yPos) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(title.toUpperCase(), ML, yPos);
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(ML, yPos + 1.5, W - MR, yPos + 1.5);
    return yPos + 6;
  };

  const fullRow = (label, value, yPos) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(110, 110, 110);
    doc.text(label, ML + 1, yPos + 5.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(25, 25, 25);
    doc.text(String(value || '\u2014'), ML + COL1_W, yPos + 5.5);
    dottedLine(ML, yPos + ROW_H, W - MR);
    return yPos + ROW_H;
  };

  const twoColRow = (l1, v1, l2, v2, yPos) => {
    const midX = ML + halfW + 2;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(110, 110, 110);
    doc.text(l1, ML + 1, yPos + 5.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(25, 25, 25);
    doc.text(String(v1 || '\u2014'), ML + COL1_W * 0.85, yPos + 5.5);

    // Vertical dotted divider
    doc.setDrawColor(190, 190, 190);
    doc.setLineWidth(0.25);
    doc.setLineDashPattern([0.8, 1.2], 0);
    doc.line(midX - 3, yPos + 1, midX - 3, yPos + ROW_H - 1);
    doc.setLineDashPattern([], 0);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(110, 110, 110);
    doc.text(l2, midX, yPos + 5.5);
    if (v2) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(25, 25, 25);
      doc.text(String(v2 || '\u2014'), midX + COL1_W * 0.85, yPos + 5.5);
    }

    dottedLine(ML, yPos + ROW_H, W - MR);
    return yPos + ROW_H;
  };

  // Contact & Personal
  y = sectionHeading('Contact & Personal Information', y);
  y = twoColRow('Email Address', emp.email, 'Phone Number', emp.phone, y);
  y = twoColRow('Date of Birth', emp.dateOfBirth, 'Gender', emp.gender, y);
  y = twoColRow('Blood Group', emp.bloodGroup, 'Marital Status', emp.maritalStatus, y);
  y = twoColRow('National ID / NID', emp.nationalId, 'Education', emp.education, y);
  y = twoColRow("Father's Name", emp.fatherName, "Mother's Name", emp.motherName, y);
  y += 5;

  // Employment Details
  y = sectionHeading('Employment Details', y);
  y = twoColRow('Designation', emp.designation, 'Department', emp.department, y);
  y = twoColRow('Employment Type', emp.employmentType, 'Date Joined', emp.dateJoined, y);
  y = twoColRow('System Role', emp.role, 'Account Status', emp.status, y);
  y += 5;

  // Emergency Contact
  y = sectionHeading('Emergency Contact', y);
  y = twoColRow('Contact Person', emp.emergencyContactName, 'Relationship', emp.emergencyContactRelation, y);
  y = fullRow('Emergency Phone', emp.emergencyContactPhone, y);
  y += 5;

  // Address
  y = sectionHeading('Address Information', y);
  y = fullRow('Present Address', emp.presentAddress, y);
  y = fullRow('Permanent Address', emp.permanentAddress, y);
  y += 8;

  // Signature lines
  y = Math.max(y, 248);
  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.35);
  doc.line(ML, y, ML + 55, y);
  doc.line(ML + 65, y, ML + 120, y);
  doc.line(ML + 130, y, W - MR, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text('Employee Signature', ML + 27.5, y + 4.5, { align: 'center' });
  doc.text('HR Manager', ML + 92.5, y + 4.5, { align: 'center' });
  doc.text('Date', ML + 152.5, y + 4.5, { align: 'center' });

  // Plain footer
  y += 14;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(ML, y, W - MR, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.text(`${COMPANY.name}  |  ${COMPANY.website}  |  Generated: ${todayStr()}`, W / 2, y + 4, { align: 'center' });

  doc.save(`Employee_Info_Sheet_${(emp.name || 'Employee').replace(/\s+/g, '_')}.pdf`);
}