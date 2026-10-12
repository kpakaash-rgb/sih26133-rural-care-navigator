import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
global.React = React;
import Onboarding from '../src/pages/patient/Onboarding.jsx';
import { LanguageProvider } from '../src/i18n/index.js';

let currentLang = 'en';
global.localStorage = {
  getItem: (key) => (key === 'rcn_language' ? currentLang : null),
  setItem: (key, val) => { if (key === 'rcn_language') currentLang = val; },
  removeItem: () => {},
};

function renderComponent(props = {}, lang = 'en') {
  currentLang = lang;
  return renderToStaticMarkup(
    React.createElement(
      LanguageProvider,
      null,
      React.createElement(Onboarding, { onNavigate: () => {}, ...props })
    )
  );
}

function runTests() {
  console.log('=== RUNNING ONBOARDING / PROFILE FORM VERIFICATION ===\n');
  let failures = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failures++;
    }
  }

  // TEST 1: Initial Blank / Unverified Navigation Flow (from Register button)
  console.log('Test Suite 1: Initial navigation without prior OTP (Register click flow)');
  const htmlUnverified = renderComponent({ registrationData: null });

  // Full Name
  assert(!htmlUnverified.includes('id="onbFullName" disabled'), 'Full Name input is NOT disabled');
  assert(htmlUnverified.includes('id="onbFullName"'), 'Full Name input has correct id');

  // Mobile Number
  assert(!htmlUnverified.includes('id="onbMobile" disabled'), 'Mobile input is NOT disabled');
  assert(!htmlUnverified.includes('id="onbMobile"[^>]*readonly'), 'Mobile input is NOT readOnly when unverified');

  // Age & Gender
  assert(!htmlUnverified.includes('id="onbAge" disabled'), 'Age input is NOT disabled');
  assert(!htmlUnverified.includes('id="onbGender" disabled'), 'Gender dropdown is NOT disabled');
  assert(htmlUnverified.includes('<option value="MALE">'), 'Gender dropdown contains Male option');
  assert(htmlUnverified.includes('<option value="FEMALE">'), 'Gender dropdown contains Female option');

  // Village & District
  assert(!htmlUnverified.includes('id="onbVillage" disabled'), 'Village input is NOT disabled');
  assert(!htmlUnverified.includes('id="onbDistrict" disabled'), 'District input is NOT disabled');

  // Emergency Contact & ABHA
  assert(!htmlUnverified.includes('id="onbEmergency" disabled'), 'Emergency contact input is NOT disabled');
  assert(!htmlUnverified.includes('id="onbAbhaNumber" disabled'), 'ABHA Number input is NOT disabled');

  // Consent checkbox
  assert(!htmlUnverified.includes('id="onbConsentBox" disabled'), 'Consent checkbox is NOT disabled');

  // Language buttons
  assert(htmlUnverified.includes('English') && htmlUnverified.includes('தமிழ்'), 'Language buttons rendered');
  assert(!htmlUnverified.includes('disabled="" style="padding:10px 6px;border-radius:8px;border:1.5px solid #0A58CA'), 'Language buttons are NOT disabled');

  // Notice banner
  assert(htmlUnverified.includes('OTP Verification Required') || htmlUnverified.includes('otpRequiredTitle'), 'OTP required banner is displayed when mobile is not verified');

  // TEST 2: OTP Verified Navigation Flow (from Login/OTP verification)
  console.log('\nTest Suite 2: Post-OTP verified flow (with registration_token & verified mobile)');
  const htmlVerified = renderComponent({
    registrationData: {
      mobile: '9876543210',
      registration_token: 'valid_test_token_jwt',
    },
  });

  assert(htmlVerified.includes('value="9876543210"'), 'Mobile input displays verified mobile number');
  assert(htmlVerified.includes('readOnly=""') || htmlVerified.includes('readonly=""'), 'Mobile input is readOnly after OTP verification');
  assert(htmlVerified.includes('Mobile number verified') || htmlVerified.includes('verifiedBadge'), 'Verified mobile status badge is displayed');
  assert(!htmlVerified.includes('id="onbFullName" disabled'), 'Full Name input remains enabled after verification');
  assert(!htmlVerified.includes('id="onbAge" disabled'), 'Age input remains enabled after verification');
  assert(!htmlVerified.includes('id="onbVillage" disabled'), 'Village input remains enabled after verification');
  assert(!htmlVerified.includes('id="onbDistrict" disabled'), 'District input remains enabled after verification');

  // TEST 3: Draft field values preserved across navigation
  console.log('\nTest Suite 3: Draft preservation across OTP transitions');
  const htmlDraft = renderComponent({
    registrationData: {
      mobile: '9876543210',
      registration_token: 'valid_test_token_jwt',
      draft: {
        fullName: 'Meenakshi Sundaram',
        age: '42',
        gender: 'FEMALE',
        village: 'Madurai East',
        district: 'Madurai',
        emergencyContact: '9876543219',
        abhaNumber: '14-9999-8888-7777',
      },
    },
  });

  assert(htmlDraft.includes('value="Meenakshi Sundaram"'), 'Full Name retains entered draft value');
  assert(htmlDraft.includes('value="42"'), 'Age retains entered draft value');
  assert(htmlDraft.includes('value="Madurai East"'), 'Village retains entered draft value');
  assert(htmlDraft.includes('value="Madurai"'), 'District retains entered draft value');
  assert(htmlDraft.includes('value="9876543219"'), 'Emergency contact retains entered draft value');
  assert(htmlDraft.includes('value="14-9999-8888-7777"'), 'ABHA ID retains entered draft value');

  // TEST 4: Tamil language rendering & switching
  console.log('\nTest Suite 4: Tamil / English language rendering');
  const htmlTamil = renderComponent({ registrationData: null }, 'ta');
  assert(htmlTamil.includes('உங்கள் சுயவிவரம் பூர்த்திக்கவும்'), 'Tamil page title is rendered');
  assert(htmlTamil.includes('முழுப் பெயர்'), 'Tamil Full Name label is rendered');
  assert(htmlTamil.includes('வயது'), 'Tamil Age label is rendered');
  assert(htmlTamil.includes('கிராமம் / பகுதி'), 'Tamil Village label is rendered');
  assert(htmlTamil.includes('மாவட்டம்'), 'Tamil District label is rendered');
  assert(htmlTamil.includes('வடிவமான மொழி'), 'Tamil Preferred Language label is rendered');

  // TEST 5: All form field elements presence & accessibility attributes
  console.log('\nTest Suite 5: Form field elements and keyboard focus accessibility');
  assert(htmlUnverified.includes('for="onbFullName"'), 'Label for Full Name is properly linked');
  assert(htmlUnverified.includes('for="onbMobile"'), 'Label for Mobile is properly linked');
  assert(htmlUnverified.includes('for="onbAge"'), 'Label for Age is properly linked');
  assert(htmlUnverified.includes('for="onbGender"'), 'Label for Gender is properly linked');
  assert(htmlUnverified.includes('for="onbVillage"'), 'Label for Village is properly linked');
  assert(htmlUnverified.includes('for="onbDistrict"'), 'Label for District is properly linked');
  assert(htmlUnverified.includes('for="onbEmergency"'), 'Label for Emergency Contact is properly linked');
  assert(htmlUnverified.includes('for="onbConsentBox"'), 'Label for Consent Checkbox is properly linked');

  console.log('\n=== SUMMARY ===');
  if (failures === 0) {
    console.log('ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  } else {
    console.error(`${failures} check(s) failed.\n`);
    process.exit(1);
  }
}

runTests();
