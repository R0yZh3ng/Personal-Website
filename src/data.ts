export type Model = 'oscar' | 'legenesis' | 'fourier' | 'picturets';

export interface Project {
    sheet: string;
    label: string;
    kind: string;
    date: string;
    summary: string;
    stack: string[];
    bullets: string[];
    model: Model;
    tag?: string;
    links: { label: string; url: string }[];
    parts?: { name: string; state: 'built' | 'untested' | 'planned'; text: string }[];
}

export const profile = {
    name: 'Roy Zheng',
    roles: ['Engineer', 'Modeler', 'Designer'],
    blurb:
        'Math student at UBC who builds things end to end: Raspberry Pi hardware, production web apps, spectral analysis and text-to-3D tooling.',
    email: 'royyi2006@gmail.com',
    phone: '+1 (604) 729-6358',
    github: 'https://github.com/R0yZh3ng',
    linkedin: 'https://linkedin.com/in/roy-zheng-06rz29',
    resume: '/resume.pdf',
    location: 'Vancouver, BC',
};

export const education = {
    school: 'University of British Columbia',
    degree: 'BSc Mathematics',
    place: 'Vancouver, BC',
    date: 'Sept 2024 – Apr 2028',
};

export const experience = [
    {
        role: 'Software Engineering Intern (incoming)',
        org: 'Prometheus Health Systems Inc',
        detail: 'Clinical Forms Platform',
        place: 'Remote',
        date: 'Jan 2027 – Apr 2027',
        bullets: [] as string[],
    },
    {
        role: 'Full-Stack Web Developer & Consultant',
        org: "Peter's Home Solution",
        detail: 'Freelance',
        place: 'Calgary, AB',
        date: 'Sept 2026 – present',
        bullets: [
            'Shipped a production site for a local home-services business (React, TypeScript, FastAPI, SQLAlchemy/PostgreSQL) as a single Docker image on Google Cloud Run, with custom domain and HTTPS.',
            'Owner-facing admin dashboard behind a secret URL: API-key auth, constant-time comparison, login lockout. Pillow upload pipeline re-encodes images and strips EXIF/GPS.',
            'Client-side bilingual (EN/中文) PDF invoices with exact integer-cent arithmetic and a concurrency-safe invoice number; billing data stays off the server by design.',
        ],
    },
];

export const projects: Project[] = [
    {
        sheet: '01',
        label: 'OSCAR',
        kind: 'Wall-projected ambient assistant',
        date: 'Sept 2026 – present',
        summary: 'Tap an RFID tag or say “oscar” and a projector on a motorised turntable swings to the right surface, showing a habit tracker warped to land as a clean rectangle. Pi hub, desktop compute, phone as the ears.',
        stack: ['Python', 'Flask', 'SQLite', 'JavaScript', 'Raspberry Pi', 'RFID', 'Chromium CDP', 'Whisper', 'systemd'],
        bullets: [
            'A small distributed system: the Pi is the always-on hub (display, RFID, tracker, PC power button), the desktop does heavy compute (speech, vision, local image-to-3D), and an iPhone web page is the mic and camera.',
            'Every input (RFID tap, voice, snap, gesture) is meant to feed one named-action dispatch function with an audit log, so they all behave the same; 80 unit tests run with no hardware via injected dependencies.',
            'Traced slow taps to page load, not the display link, and replaced relaunch-per-tap with a kept-alive Chromium that activates preloaded tabs over its remote-debugging API.',
            'Per-surface keystone correction: a 4-point homography (DLT, Gaussian elimination) emitted as a CSS matrix3d, with a calibrated preset for each aim point (wall, closet) that re-warps every open tab live over Server-Sent Events.',
        ],
        parts: [
            { name: 'Habit tracker', state: 'built', text: 'Flask + SQLite, XP / levels / streaks, a high-contrast wall theme; used on the real projector.' },
            { name: 'RFID → tab switch', state: 'built', text: 'A tap activates an already-loaded Chromium tab over its debugging port, so switching is instant.' },
            { name: 'Per-wall projection warp', state: 'untested', text: 'Homography + calibration page + live updates, unit-tested and seen in a browser; not yet calibrated on the Pi or projector.' },
            { name: 'Phone sensor + PC wake', state: 'untested', text: 'HTTPS mic stream from an iPhone; a GPIO pulse wakes the PC, then SSH unlocks it. Built, not yet tried on hardware.' },
            { name: 'Assistant', state: 'untested', text: 'Claude tool-use loop over habit, page and PC tools, with a Whisper-transcript wake word. Unit-tested, not yet run end to end.' },
            { name: 'Stepper turntable', state: 'planned', text: 'Printed PETG base on a lazy-susan bearing, 28BYJ-48 stepper, homing switch; aims between wall and closet.' },
            { name: 'LEDs, LCD, command router', state: 'planned', text: 'ReSpeaker RGB LEDs show mode (work / daily) and listening state; one router feeds every input.' },
            { name: 'Projector power', state: 'planned', text: 'IR blaster replaying the remote’s power code (the HDMI-signal approach was tested and failed).' },
            { name: 'Local AI + printing', state: 'planned', text: 'Voice or sketch → concept image → Hunyuan3D → GLB on the wall → Bambu A1; a local Qwen3-class model for the assistant. Image-to-3D spike runs on the PC (56 s, 8.2 GB VRAM).' },
        ],
        links: [{ label: 'GitHub', url: 'https://github.com/R0yZh3ng/OSCAR' }],
        model: 'oscar',
    },
    {
        sheet: '02',
        label: 'LeGenesis',
        kind: 'Sketch + prompt to 3D model',
        date: 'Mar 2026',
        tag: 'Hackathon',
        summary: 'Draw a concept, type a prompt, and watch an AI-generated 3D model appear beside the canvas. Small edits reuse the last result instead of starting over.',
        stack: ['React', 'React Three Fiber', 'FastAPI', 'SQLAlchemy', 'Supabase', 'MeshyAI', 'Fetch.ai uAgents'],
        bullets: [
            'Split-screen editor: a sketch canvas on one side, a live React Three Fiber viewer on the other, with the sketch and prompt re-submitted as you draw.',
            'FastAPI runs a real Meshy pipeline (sketch or text → concept image → image-to-3D) and uploads both outputs to Supabase storage; only models you explicitly save are copied to permanent storage and the database.',
            'A stateless, expiring signed context_token carries the previous concept image and mesh pointers, so a small edit routes to a faster preview path with no database round-trip.',
            'A Fetch.ai (uAgents) planner classifies the request and routes it through a single-view or multi-view pipeline by speed/quality, with a local fallback when the agent is unreachable.',
        ],
        parts: [
            { name: 'Sketch canvas + viewer', state: 'built', text: 'React Sketch Canvas beside a React Three Fiber model viewer, with Tailwind UI.' },
            { name: 'Generation pipeline', state: 'built', text: 'FastAPI + Meshy: concept image → image-to-3D → GLB, uploaded to Supabase tmp/.' },
            { name: 'context_token edit loop', state: 'built', text: 'Signed, expiring token with prior concept and model pointers for fast iterative edits.' },
            { name: 'Fetch.ai planner', state: 'built', text: 'uAgents service picks single- or multi-view routing by speed/quality; falls back to local planning.' },
            { name: 'Save + model library', state: 'built', text: 'Saving copies tmp/ to saved/ in Supabase and records id, name and URL in Postgres.' },
            { name: 'AR preview, .glb download, prompt assistant', state: 'planned', text: 'Drafted in the features plan: model-viewer AR, a download button, and a Fetch.ai prompt-refine agent.' },
        ],
        links: [{ label: 'GitHub', url: 'https://github.com/elijahzhao24/produhacks-2026' }],
        model: 'legenesis',
    },
    {
        sheet: '03',
        label: 'Fourier Engine',
        kind: 'Spectral analysis of markets',
        date: 'Apr – Jun 2026',
        summary: 'Finds the dominant cycles hiding in equity prices with Welch’s method, extrapolates them into a forecast, then tests that forecast honestly. The result is a coin flip, and the project is about knowing why.',
        stack: ['Python', 'NumPy', 'Pandas', 'SciPy', 'yfinance', 'Matplotlib'],
        bullets: [
            'Pipeline: prices (yfinance, cached as parquet) → daily log returns, verified stationary with an ADF test → Welch’s PSD over overlapping windows → top 10 cycles of at least 5 trading days.',
            'Each cycle is isolated with a zero-phase Butterworth bandpass (order 3, filtfilt), fitted with a nonlinear least-squares sine, and extrapolated; the fits are summed like an inverse transform into one forecast with a confidence interval.',
            'Walk-forward backtest over 220 trades: 49.1% directional accuracy on TSLA, 48.2% on SPY, 46.4% on MAGS. Indistinguishable from chance, which is what the Efficient Market Hypothesis predicts.',
            'Caught and fixed a bug that fed the frequency array into the bandpass filter instead of the return series; the earlier, flashier hit rates were an artifact of filtering garbage, not an edge.',
        ],
        parts: [
            { name: 'Data pipeline', state: 'built', text: 'yfinance → parquet cache → log returns → ADF stationarity test.' },
            { name: 'Spectral analysis', state: 'built', text: 'Welch PSD (variance reduction by averaging windows); cycles under 5 days filtered as microstructure noise.' },
            { name: 'Cycle extraction + prediction', state: 'built', text: 'Butterworth bandpass per cycle, curve_fit sine, summed forecast with a confidence interval.' },
            { name: 'Walk-forward backtest', state: 'built', text: 'Sliding-window validation, 220 trades per ticker; results reported against the 50% baseline.' },
            { name: 'Dashboard', state: 'built', text: 'Three panels per ticker: power spectrum, top cycles over price, forecast with confidence band.' },
            { name: 'Sonification', state: 'built', text: 'Cycles mapped to audible pitches on a logarithmic scale and written out as a .wav (“market music”).' },
        ],
        model: 'fourier',
        links: [{ label: 'GitHub', url: 'https://github.com/R0yZh3ng/Fourier-Analysis-for-financial-markets' }],
    },
    {
        sheet: '04',
        label: 'PictureTs',
        kind: 'AI camera coach',
        date: 'Nov 2025',
        tag: 'Kickstart ’25 · 6th place',
        summary: 'A mobile camera that coaches you while you shoot: live composition feedback and a pro score, with zoom, exposure and flash adjusted for you.',
        stack: ['React Native', 'Expo', 'TypeScript', 'AWS Bedrock', 'Skia'],
        bullets: [
            'Team of 4. About every two seconds the app grabs a viewfinder frame, shrinks it to 480 px JPEG, and sends it to AWS Bedrock (Nova Lite) with a prompt-engineered brief that asks for a score and short, directional commands.',
            'Responses come back as structured JSON that the app parses into the PRO SCORE meter, two feedback bubbles, and automatic zoom, exposure and flash adjustments; a style field (“Cinematic”, “Minimalist”) steers the advice.',
            'A live rule-of-thirds grid overlays the viewfinder, and a score of 90+ flips the UI to “PERFECT SHOT” and pulses the shutter.',
            'Built a custom image pipeline on React Native Skia, applying brightness, contrast and saturation through color-matrix transformations after finding that expo-image-manipulator lacked low-level pixel operations.',
        ],
        parts: [
            { name: 'Viewfinder + coaching UI', state: 'built', text: 'Expo camera, thirds grid, PRO SCORE, feedback bubbles, style input, shutter.' },
            { name: 'Frame → Bedrock loop', state: 'built', text: 'Throttled capture, 480 px JPEG, Bedrock Converse call, JSON command parsing.' },
            { name: 'Auto zoom / exposure / flash', state: 'built', text: 'Model commands drive the camera controls instead of just advising.' },
            { name: 'Skia color pipeline', state: 'built', text: 'Brightness, contrast and saturation as color matrices on a Skia canvas.' },
        ],
        model: 'picturets',
        links: [{ label: 'GitHub', url: 'https://github.com/Gobl1nGang/PictureTs.ai' }],
    },
];

export const skills: { label: string; items: string[] }[] = [
    { label: 'Programming', items: ['Python', 'C/C++', 'Java', 'TypeScript', 'JavaScript', 'SQL', 'React', 'React Native', 'FastAPI', 'Flask'] },
    { label: 'Quantitative', items: ['Signal Processing', 'Spectral Analysis', 'Time Series Modelling', 'Backtesting', 'Market Microstructure'] },
    { label: 'Machine Learning', items: ['PyTorch', 'scikit-learn', 'Autoencoder Architectures', 'Anomaly Detection', 'Gradient-based Optimization'] },
    { label: 'Mathematical', items: ['Linear Algebra', 'Numerical Methods', 'Probability', 'Dynamical Systems'] },
    { label: 'Systems & Tools', items: ['Linux', 'Git', 'Docker', 'AWS', 'Google Cloud Run', 'Raspberry Pi', 'systemd', 'NeoVim'] },
];
