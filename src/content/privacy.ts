/**
 * Privacy policy content (Hebrew + English). Written from what FLAGFORGE actually stores and does — see
 * docs/SECURITY.md and docs/DATABASE.md. Update `updated` and the relevant section whenever data handling
 * changes (a new field, a new provider, analytics, a new email type…).
 */
export interface PrivacySection {
  title: string;
  paragraphs?: string[];
  items?: string[];
  /** paragraphs shown after the list */
  after?: string[];
}

export interface PrivacyContent {
  title: string;
  updated: string;
  intro: string;
  sections: PrivacySection[];
}

export const PRIVACY_CONTACT = "flagforge.game@gmail.com";
export const PRIVACY_UPDATED = "2026-11-15";

export const privacy: Record<"he" | "en", PrivacyContent> = {
  he: {
    title: "מדיניות פרטיות",
    updated: "עודכנה לאחרונה: 15 בנובמבר 2026",
    intro:
      "FLAGFORGE הוא משחק גאוגרפיה בעברית ובאנגלית. המדיניות הזו מסבירה איזה מידע נשמר כשמשחקים או נרשמים, למה, מי רואה אותו ומה הזכויות שלכם. אנחנו אוספים את המינימום שהמשחק צריך — בלי פרסומות, בלי מעקב ובלי מכירת מידע.",
    sections: [
      {
        title: "משחק בלי חשבון",
        paragraphs: [
          "אפשר לשחק במשחק הרגיל בלי להירשם. במקרה כזה לא נשמר שום מידע מזהה ולא נשמרות תוצאות. כתובת ה־IP משמשת לרגע כדי להגביל עומס חריג (הגבלת קצב) ולא נשמרת על ידינו.",
        ],
      },
      {
        title: "מה נשמר כשנרשמים",
        items: [
          "כתובת אימייל — לכניסה לחשבון ולשליחת מיילים הכרחיים בלבד (אימות הרשמה ואיפוס סיסמה). לא נשלחים מיילים שיווקיים.",
          "שם משתמש — חובה; מוצג לשחקנים אחרים.",
          "שם תצוגה — לא חובה; אם בחרתם בו, מוצג לשחקנים אחרים.",
          "סיסמה — נשמרת אצל ספק ההזדהות רק בצורה מוצפנת חד־כיוונית (hash). אף אחד, כולל אנחנו, לא יכול לראות אותה.",
          "שפה מועדפת.",
          "נתוני משחק — משחקים, תשובות, זמנים, תוצאות באתגר היומי, הישגים ומדינות שגיליתם באטלס.",
        ],
        after: [
          "אימייל, שם משתמש וסיסמה נדרשים כדי לפתוח חשבון; בלעדיהם אפשר לשחק כאורחים, אבל בלי אתגר יומי, היכל תהילה, הישגים ואטלס.",
        ],
      },
      {
        title: "למה המידע משמש",
        items: [
          "הפעלת החשבון והכניסה אליו.",
          "המשחק עצמו: בדיקת תשובות, מדידת זמן, ניקוד, רצפים, הישגים ואטלס אישי.",
          "היכל התהילה — טבלאות יומיות, שבועיות וחודשיות.",
          "שמירה על הוגנות ואבטחה: מניעת זיוף תוצאות והגבלת שימוש לרעה.",
        ],
      },
      {
        title: "מה גלוי לשחקנים אחרים",
        paragraphs: [
          "בהיכל התהילה מוצגים שם המשתמש, שם התצוגה (אם יש), מספר התשובות הנכונות והזמן. כתובת האימייל, הסטטיסטיקות האישיות, ההישגים והאטלס גלויים רק לכם.",
        ],
      },
      {
        title: "עוגיות ואחסון בדפדפן",
        paragraphs: [
          "האתר משתמש רק בעוגיות הכרחיות: עוגיית התחברות (כדי שתישארו מחוברים) ועוגיית שפה. אין עוגיות פרסום, אין כלי אנליטיקה ואין מעקב של צד שלישי.",
        ],
      },
      {
        title: "נותני שירות",
        paragraphs: ["כדי להפעיל את האתר אנחנו נעזרים בספקים שמעבדים מידע בשבילנו בלבד:"],
        items: [
          "Supabase — מסד הנתונים וההזדהות (שרת באזור מערב אירופה, לונדון).",
          "Vercel — אחסון האתר והשרת (שרתים באירופה ורשת הפצה עולמית).",
          "Google (Gmail) — שליחת מיילי אימות ואיפוס סיסמה.",
        ],
      },
      {
        title: "כמה זמן המידע נשמר",
        paragraphs: [
          "המידע נשמר כל עוד החשבון קיים. כשמוחקים חשבון, הפרופיל, המשחקים, התוצאות וההישגים נמחקים מיד ולצמיתות. ייתכן שעותקי גיבוי או יומני מערכת אצל נותני השירות יישמרו לתקופה מוגבלת לפי המדיניות שלהם.",
        ],
      },
      {
        title: "הזכויות שלכם",
        items: [
          "לעיין במידע — הפרופיל, הסטטיסטיקות וההיסטוריה מוצגים לכם באתר; לעותק מלא אפשר לפנות במייל.",
          "לתקן — שם משתמש, שם תצוגה, שפה וסיסמה ניתנים לשינוי בדף ההגדרות.",
          "למחוק — בדף ההגדרות יש מחיקת חשבון מלאה, בלי צורך לפנות אלינו.",
          "לפנות בכל שאלה, בקשה או תלונה לכתובת שלמטה. אפשר גם לפנות לרשות להגנת הפרטיות.",
        ],
      },
      {
        title: "אבטחה",
        paragraphs: [
          "כל התעבורה מוצפנת (HTTPS). הגישה למסד הנתונים מוגבלת כך שכל משתמש רואה רק את המידע שלו, והחשבונות שמנהלים את האתר מוגנים באימות דו־שלבי. אף מערכת אינה חסינה לחלוטין; אם יתגלה אירוע אבטחה שנוגע למידע שלכם, נעדכן.",
        ],
      },
      {
        title: "קטינים",
        paragraphs: [
          "המשחק מתאים לכל הגילים, וכדי לשחק כאורחים לא צריך למסור שום פרט. אם אתם מתחת לגיל 18, פתחו חשבון רק בהסכמת הורה. הורים יכולים לבקש מאיתנו למחוק חשבון של ילדם.",
        ],
      },
      {
        title: "שינויים ופנייה",
        paragraphs: [
          "אם נשנה את אופן הטיפול במידע, נעדכן את הדף הזה ואת תאריך העדכון שבראשו.",
          `לכל שאלה: ${PRIVACY_CONTACT}`,
        ],
      },
    ],
  },
  en: {
    title: "Privacy policy",
    updated: "Last updated: 15 November 2026",
    intro:
      "FLAGFORGE is a geography game in Hebrew and English. This policy explains what is stored when you play or sign up, why, who can see it and what your rights are. We collect the minimum the game needs — no ads, no tracking, no selling of data.",
    sections: [
      {
        title: "Playing without an account",
        paragraphs: [
          "You can play standard games without signing up. Nothing that identifies you and no results are stored. Your IP address is used momentarily to limit abusive traffic (rate limiting) and is not stored by us.",
        ],
      },
      {
        title: "What is stored when you sign up",
        items: [
          "Email address — to sign in and to send essential emails only (sign-up confirmation and password reset). No marketing emails.",
          "Username — required; shown to other players.",
          "Display name — optional; shown to other players if you set one.",
          "Password — stored by the authentication provider only as a one-way hash. Nobody, including us, can see it.",
          "Preferred language.",
          "Game data — games, answers, times, daily challenge results, achievements and the countries you discovered on your atlas.",
        ],
        after: [
          "Email, username and password are required to open an account; without one you can still play as a guest, but without the daily challenge, Hall of Fame, achievements and atlas.",
        ],
      },
      {
        title: "How the data is used",
        items: [
          "Running your account and signing you in.",
          "The game itself: checking answers, timing, scoring, streaks, achievements and your personal atlas.",
          "The Hall of Fame — daily, weekly and monthly standings.",
          "Fairness and security: preventing forged results and limiting abuse.",
        ],
      },
      {
        title: "What other players can see",
        paragraphs: [
          "The Hall of Fame shows your username, your display name (if any), the number of correct answers and your time. Your email, personal statistics, achievements and atlas are visible only to you.",
        ],
      },
      {
        title: "Cookies and browser storage",
        paragraphs: [
          "The site uses only essential cookies: a sign-in cookie (to keep you signed in) and a language cookie. No advertising cookies, no analytics tools, no third-party tracking.",
        ],
      },
      {
        title: "Service providers",
        paragraphs: ["To run the site we rely on providers that process data only on our behalf:"],
        items: [
          "Supabase — database and authentication (West Europe region, London).",
          "Vercel — hosting and servers (servers in Europe and a global delivery network).",
          "Google (Gmail) — sending confirmation and password-reset emails.",
        ],
      },
      {
        title: "How long data is kept",
        paragraphs: [
          "Data is kept for as long as your account exists. Deleting your account immediately and permanently deletes your profile, games, results and achievements. Backups or system logs held by our providers may persist for a limited period under their own policies.",
        ],
      },
      {
        title: "Your rights",
        items: [
          "Access — your profile, statistics and history are shown to you on the site; for a full copy, email us.",
          "Correction — username, display name, language and password can be changed in Settings.",
          "Deletion — Settings has a complete account deletion, no need to contact us.",
          "Questions, requests or complaints go to the address below; you can also contact the Israeli Privacy Protection Authority.",
        ],
      },
      {
        title: "Security",
        paragraphs: [
          "All traffic is encrypted (HTTPS). Database access is restricted so each user sees only their own data, and the accounts that run the site are protected by two-factor authentication. No system is perfectly secure; if a security incident affects your data, we will let you know.",
        ],
      },
      {
        title: "Minors",
        paragraphs: [
          "The game is suitable for all ages, and playing as a guest requires no personal details. If you are under 18, open an account only with a parent's permission. Parents may ask us to delete their child's account.",
        ],
      },
      {
        title: "Changes and contact",
        paragraphs: [
          "If we change how data is handled, we will update this page and the date at its top.",
          `Questions: ${PRIVACY_CONTACT}`,
        ],
      },
    ],
  },
};
