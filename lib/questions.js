// Single source of truth for questions — drives the form UI, the review page, and the PDF.
// Types:
//   'text'     : short text input
//   'email'    : email input
//   'date'     : native date picker
//   'long'     : textarea
//   'chips'    : multi-select tap-chip list; options[] and allowOther
//   'yesno'    : Yes / No pill switch
//   'confirm'  : single acknowledgement checkbox with long text (replaces "type I confirm")

export const STEPS = [
  {
    id: 'about',
    tag: 'STEP 1 · About you',
    title: 'A few basics',
    intro: 'This intake exists to keep you and everyone else at the retreat safe. All information is stored securely and treated in strict confidence.',
    questions: [
      { id: 'full_name',  type: 'text',  label: 'Full name', required: true, placeholder: 'As it appears on your passport' },
      { id: 'dob',        type: 'date',  label: 'Date of birth', required: true },
      { id: 'email',      type: 'email', label: 'Email',       required: true, placeholder: 'you@example.com',
        help: 'A copy of your completed intake will be sent to this address.' },
      { id: 'self_complete_confirm', type: 'confirm', required: true,
        label: 'I confirm I am completing this entire application by myself.',
        detail: 'For your safety, we require that each booking and all communication regarding a person\'s registration is completed directly by the registered guest alone.' },
    ],
  },

  {
    id: 'set_setting',
    tag: 'STEP 2 · Set & setting',
    title: 'Your reasons for attending',
    questions: [
      { id: 'reasons', type: 'chips', label: 'Reasons for attending the retreat (select all that apply)',
        options: [
          'Healing acute or developmental trauma',
          'Emotional healing',
          'Physical healing',
          'Psychological healing',
          'Spiritual growth',
          'Addictions',
          'Life purpose',
        ],
        allowOther: true,
      },
      { id: 'intentions', type: 'long', required: true,
        label: 'What are your intentions and expectations for working with ayahuasca?',
        help: 'Please share at least a paragraph or two.' },
      { id: 'prior_ayahuasca', type: 'long',
        label: 'Have you ever participated in an ayahuasca ceremony, or ingested ayahuasca?',
        help: 'If yes, briefly describe the set and setting, roughly how much you ingested, and your experience.' },
      { id: 'living_situation', type: 'long', required: true,
        label: 'Briefly describe your current living situation and how you feel within it.' },
      { id: 'support_network', type: 'long', required: true,
        label: 'Do you have a support network — friends, family, community, or professional supports such as a therapist? Briefly describe who is there for you in your life.' },
    ],
  },

  {
    id: 'medical',
    tag: 'STEP 3 · Medical background',
    title: 'Your physical health',
    questions: [
      { id: 'covid_vax', type: 'long',
        label: 'Have you been vaccinated for COVID-19?',
        help: 'If yes: how many shots, of which kind, and did you have any adverse reactions? This matters especially due to reported cardiological reactions.' },

      { id: 'conditions', type: 'chips',
        label: 'Please indicate any conditions you currently have or have had in the past (select all that apply)',
        options: [
          'High blood pressure', 'Low blood pressure', 'Seizures', 'Chronic pain', 'Circulatory problems',
          'Cancer', 'Tumors', 'Hernia', 'Stroke', 'HIV / AIDS', 'Asthma', 'Heart attack', 'Irregular heartbeat',
          'Heart surgery', 'Chest pain', 'Chest angina', 'Heart murmur', 'Aneurysm (brain, chest, or abdomen)',
          'Tuberculosis', 'Ulcer', 'Headaches', 'Cranial trauma / head injuries', 'Diabetes', 'Prediabetes',
          'Obesity', 'Visual impairment', 'Infectious disease', 'Physical disability', 'Meningitis',
          'Multiple sclerosis', 'Arthritis', 'Autism', 'Gynecological condition', 'Neurological disease',
          'Hyperthyroidism', 'Hypothyroidism', 'Hypertension (over 150 mmHg)', 'Hypotension (below 90/60 mmHg)',
          'Sleep apnea', 'Autoimmune disorder (not previously listed)',
        ],
        allowOther: true,
        allowNone: 'None of the above',
      },
      { id: 'conditions_detail', type: 'long',
        label: 'If you indicated any of the above, please give us more information about them.' },
      { id: 'biggest_physical_challenge', type: 'long', required: true,
        label: 'What is the biggest challenge to your physical health today? Please be specific.' },
      { id: 'major_surgery', type: 'long',
        label: 'Have you ever had major surgery of any kind?',
        help: 'If yes, specify the date and reason.' },
      { id: 'physical_trauma', type: 'long',
        label: 'Have you ever had a serious car accident or other serious physical trauma?',
        help: 'If yes, describe what happened and when.' },
      { id: 'family_physical_history', type: 'long',
        label: 'Any physical conditions in your family history (epilepsy, MS, ALS, etc.)?',
        help: 'If yes, please describe.' },
    ],
  },

  {
    id: 'psychological',
    tag: 'STEP 4 · Psychological history',
    title: 'Your mental & emotional health',
    intro: 'If you answer yes to any of the following, please provide a little context.',
    questions: [
      { id: 'biggest_mental_challenge', type: 'long', required: true,
        label: 'What are the biggest challenges to your emotional and mental well-being currently? Please be specific.' },

      { id: 'psych_conditions', type: 'chips',
        label: 'Psychiatric conditions you have or have had in the past (select all that apply)',
        options: [
          'Anxiety', 'Depression', 'Addiction', 'ADHD / ADD', 'Eating disorder', 'Insomnia', 'Phobias',
          'Multiple personality disorder', 'Schizophrenia', 'Depersonalization disorder',
          'Borderline personality disorder', 'Dissociation', 'Bipolar disorder', 'Psychotic outbreak',
          'Chronic grief', 'Suicidal ideation / tendency', 'Self-harming', 'PTSD', 'OCD',
        ],
        allowOther: true,
        allowNone: 'None of the above',
      },
      { id: 'psych_detail', type: 'long',
        label: 'If any of the above apply, please share the timeframe (past or current), whether you\'ve been clinically diagnosed, and how they affect your day-to-day life.' },
      { id: 'psych_hospitalized', type: 'long',
        label: 'Have you ever been hospitalized or received treatment for any of the above conditions?' },

      { id: 'panic_attacks',  type: 'yesno', label: 'Do you experience panic attacks?' },
      { id: 'panic_attacks_detail', type: 'long', label: 'If yes, please share a little context.', dependsOn: { field: 'panic_attacks', value: 'Yes' } },

      { id: 'nightmares',     type: 'yesno', label: 'Do you experience nightmares?' },
      { id: 'nightmares_detail', type: 'long', label: 'If yes, please share a little context.', dependsOn: { field: 'nightmares', value: 'Yes' } },

      { id: 'violence_arrest',type: 'yesno', label: 'Have you ever been arrested or cautioned in relation to violence?' },
      { id: 'violence_arrest_detail', type: 'long', label: 'If yes, please share a little context.', dependsOn: { field: 'violence_arrest', value: 'Yes' } },

      { id: 'gang_member',    type: 'yesno', label: 'Have you ever been a member of a gang?' },
      { id: 'gang_detail', type: 'long', label: 'If yes, please share a little context.', dependsOn: { field: 'gang_member', value: 'Yes' } },

      { id: 'cult_member',    type: 'yesno', label: 'Have you or any of your primary caregivers been a member of a cult?' },
      { id: 'cult_detail', type: 'long', label: 'If yes, please share a little context.', dependsOn: { field: 'cult_member', value: 'Yes' } },

      { id: 'violence_history', type: 'yesno', label: 'Any past or present history of violence or street fighting?' },
      { id: 'violence_history_detail', type: 'long', label: 'If yes, please share a little context.', dependsOn: { field: 'violence_history', value: 'Yes' } },

      { id: 'suicidal', type: 'long', required: true,
        label: 'Do you currently have, or have you ever had, suicidal thoughts?',
        help: 'If yes, with what frequency?' },
      { id: 'therapy', type: 'long',
        label: 'Have you ever received or are you undergoing therapy? What has worked well for you?' },
      { id: 'psychotic_manic', type: 'long',
        label: 'Have you ever experienced psychotic breaks or manic episodes?' },
      { id: 'paranoia', type: 'long',
        label: 'Have you ever experienced prolonged or frequent periods of paranoia?' },

      { id: 'adverse_experiences', type: 'chips',
        label: 'Throughout your life, have you ever experienced any of the following?',
        options: [
          'Physical abuse',
          'Sexual abuse',
          'Emotional or psychological abuse',
          'Physical violence in your household',
          'Mentally ill parent/s or primary caregiver/s',
          'Primary caregiver/s or partner/s with addiction issues',
          'A parent or relative being incarcerated',
        ],
        allowOther: true,
        allowNone: 'None of these',
      },
      { id: 'adverse_detail', type: 'long',
        label: 'If any apply, please share the timeframe (when it happened and for how long), some details, and how these experiences affect your day-to-day life.' },
      { id: 'family_mental_history', type: 'long',
        label: 'Any history in your immediate family of mental illness?' },
    ],
  },

  {
    id: 'substances',
    tag: 'STEP 5 · Substances & pharmaceutical history',
    title: 'Substances and medications',
    questions: [
      { id: 'alcohol_use', type: 'long', required: true,
        label: 'What is your typical consumption of alcoholic beverages?' },
      { id: 'alcoholic', type: 'long',
        label: 'Have you ever been diagnosed, treated, or self-identified as an alcoholic?' },
      { id: 'rec_drugs', type: 'long',
        label: 'Have you ever used street or recreational drugs (cannabis, cocaine, methamphetamines, heroin, others)?',
        help: 'If yes: which, when, and with what frequency.' },
      { id: 'psychedelics', type: 'long',
        label: 'Have you ever ingested a psychedelic (LSD, psilocybin, mescaline, iboga, ayahuasca, DMT, others)?',
        help: 'If yes: which, when, and with what frequency.' },
      { id: 'psychedelic_negative', type: 'long',
        label: 'Have you ever had a negative experience with a psychedelic?' },
      { id: 'other_psych_challenges', type: 'long',
        label: 'Any other relevant psychological challenges not mentioned above that you\'ve had in your life?' },

      { id: 'allergies', type: 'long', required: true,
        label: 'Are you allergic to any medications?',
        help: 'If yes, which ones?' },
      { id: 'antidepressants', type: 'long', required: true,
        label: 'Are you currently taking, or have you recently stopped taking (within the last six months), antidepressants?',
        help: 'Examples: citalopram (Celexa, Cipramil), escitalopram (Lexapro, Cipralex), fluoxetine (Prozac), fluvoxamine (Luvox), paroxetine (Paxil, Pexeva), venlafaxine (Effexor), sertraline (Zoloft), bupropion (Wellbutrin), or others. If yes, list them and the dates you began and stopped.' },
      { id: 'other_meds', type: 'long', required: true,
        label: 'Any other prescription or other medications currently or recently stopped (within the past three months)?',
        help: 'If yes, list them and the dates you began and stopped.' },

      { id: 'anything_else', type: 'long',
        label: 'Is there anything else regarding your health history that you feel we should know?' },
    ],
  },

  {
    id: 'declarations',
    tag: 'STEP 6 · Declarations',
    title: 'Please read and confirm',
    intro: 'These are not formalities. Please read each one carefully before ticking.',
    questions: [
      { id: 'declare_discontinue', type: 'confirm', required: true,
        label: 'I will completely discontinue alcohol, cannabis, recreational drugs, plant medicines / psychedelics (including but not limited to San Pedro, mushrooms, LSD, etc.), and any non-prescribed pharmaceuticals at least two weeks prior to the start of the retreat.',
        detail: 'I understand these are strongly contraindicated with ayahuasca, and are dangerous — some potentially fatal — when combined.' },
      { id: 'declare_understand_contraindicated', type: 'confirm', required: true,
        label: 'I understand that many substances are strongly contraindicated with plant medicines and can be dangerous or potentially fatal when combined.' },
      { id: 'declare_drug_test', type: 'confirm', required: true,
        label: 'I understand that under special circumstances I may be required to take a drug or breathalyzer test prior to or during the workshop, without prior notice or reason.',
        detail: 'If I refuse to comply, Wyrd Pharm reserves the right to deny my entry to the workshop, or to expel me from the workshop immediately and without prior notice, responsibility for a refund, or providing accommodation outside of the retreat space.' },
      { id: 'declare_truthful', type: 'confirm', required: true,
        label: 'I have completed this questionnaire myself, have answered truthfully, and understand that withholding or misrepresenting medical information could result in serious health complications when ingesting ayahuasca.' },
      { id: 'signature', type: 'text', required: true,
        label: 'Signed (type your full name)', placeholder: 'Full name' },
    ],
  },
];

// Flat list of all questions with their step id — handy for the review page and the PDF.
export const ALL_QUESTIONS = STEPS.flatMap(s =>
  s.questions.map(q => ({ ...q, stepId: s.id, stepTitle: s.title, stepTag: s.tag }))
);

export function isVisible(q, answers) {
  if (!q.dependsOn) return true;
  return answers[q.dependsOn.field] === q.dependsOn.value;
}

export function validateStep(step, answers) {
  const missing = [];
  for (const q of step.questions) {
    if (!isVisible(q, answers)) continue;
    if (!q.required) continue;
    const v = answers[q.id];
    if (q.type === 'confirm') {
      if (v !== true) missing.push(q);
    } else if (q.type === 'chips') {
      if (!Array.isArray(v) || v.length === 0) missing.push(q);
    } else {
      if (v === undefined || v === null || String(v).trim() === '') missing.push(q);
    }
  }
  return missing;
}

export function formatAnswer(q, v) {
  if (q.type === 'confirm') return v === true ? 'Confirmed' : '—';
  if (q.type === 'chips') {
    if (!Array.isArray(v) || v.length === 0) return '—';
    return v.join(', ');
  }
  if (q.type === 'yesno') return v || '—';
  if (v === undefined || v === null || String(v).trim() === '') return '—';
  return String(v);
}
