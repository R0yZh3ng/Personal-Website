export type Shape = 'icosahedron' | 'octahedron' | 'dodecahedron' | 'tetrahedron' | 'box';

export interface Project {
    id: string;
    key: string;
    label: string;
    kind: string;
    date: string;
    summary: string;
    stack: string[];
    bullets: string[];
    color: string;
    orbit: number;   // semi-major axis, AU
    ecc: number;     // eccentricity
    tilt: number;    // inclination, rad
    phase: number;   // starting angle, rad
    shape: Shape;
    solidScale: number;
    rotSpeed: number;
}

export const profile = {
    name: 'Roy Zheng',
    handle: 'roy@zheng',
    tagline: ['mathematics @ UBC', 'signal processing', 'systems & ml'],
    email: 'royyi2006@gmail.com',
    github: 'https://github.com/R0yZh3ng',
    linkedin: 'https://linkedin.com/in/roy-zheng-06rz29',
    resume: '/resume.pdf',
    school: 'University of British Columbia',
    degree: 'BSc Mathematics',
    years: 'Sept 2024 – Apr 2028',
};

export const projects: Project[] = [
    {
        id: 'oscar',
        key: 'oscar',
        label: 'OSCAR',
        kind: 'Wall-projected assistant',
        date: 'Sept 2026 – now',
        summary: 'A Raspberry Pi hub that projects a habit tracker onto a wall and switches pages on an RFID tap.',
        stack: ['Python', 'Flask', 'SQLite', 'JavaScript', 'Raspberry Pi', 'systemd'],
        bullets: [
            'Every state change goes through one named-action dispatch function with an audit log; 63 unit tests run with no hardware via injected dependencies.',
            'Traced slow taps to page load, not the display link; replaced relaunch-per-tap with a kept-alive Chromium that activates preloaded tabs over its remote-debugging API.',
            'Per-wall keystone correction: a 4-point homography (DLT, Gaussian elimination) emitted as a CSS matrix3d, re-warping every open tab live via Server-Sent Events.',
        ],
        color: '#67e8f9',
        orbit: 4.5,
        ecc: 0.08,
        tilt: 0.1,
        phase: 0.5,
        shape: 'icosahedron',
        solidScale: 1.4,
        rotSpeed: 1.0,
    },
    {
        id: 'fourier',
        key: 'fourier',
        label: 'Fourier Engine',
        kind: 'Spectral analysis of markets',
        date: 'Apr – Jun 2026',
        summary: 'Welch PSD over raw FFT to pull dominant cycles out of equity prices, with a walk-forward backtest.',
        stack: ['Python', 'NumPy', 'Pandas', 'SciPy'],
        bullets: [
            "Welch's method with windowed averaging over overlapping segments improves frequency resolution on low-SNR series.",
            'Walk-forward backtest, sliding-window validation across 220 trades: 49.1% directional accuracy on TSLA, 48.2% on SPY, 46.4% on MAGS.',
            'Near-random results read as empirical evidence consistent with the Efficient Market Hypothesis.',
        ],
        color: '#a78bfa',
        orbit: 6.5,
        ecc: 0.12,
        tilt: -0.14,
        phase: 2.4,
        shape: 'octahedron',
        solidScale: 1.2,
        rotSpeed: 1.4,
    },
    {
        id: 'peters',
        key: 'peters',
        label: "Peter's Home Solution",
        kind: 'Production site + admin tools',
        date: 'Sept 2026 – now',
        summary: 'Full-stack site, admin dashboard and invoice generator for a local home-services business.',
        stack: ['React', 'TypeScript', 'FastAPI', 'PostgreSQL', 'Docker', 'Cloud Run'],
        bullets: [
            'One Docker image on Google Cloud Run with a custom domain and auto-provisioned HTTPS.',
            'Owner-only admin behind a non-guessable URL: API-key auth, constant-time comparison, login lockout; photo uploads re-encoded to strip EXIF/GPS.',
            'Client-side bilingual (EN/中文) PDF invoices with exact integer-cent arithmetic and a concurrency-safe invoice counter; billing data never touches the server.',
        ],
        color: '#34d399',
        orbit: 8.5,
        ecc: 0.05,
        tilt: 0.08,
        phase: 4.1,
        shape: 'box',
        solidScale: 1.15,
        rotSpeed: 0.7,
    },
    {
        id: 'picturets',
        key: 'picturets',
        label: 'PictureTs',
        kind: 'Kickstart ’25 · 6th place',
        date: 'Nov 2025',
        summary: 'AI camera assistant that critiques composition live and auto-adjusts zoom, exposure and flash.',
        stack: ['React Native', 'TypeScript', 'AWS Bedrock', 'Skia'],
        bullets: [
            'Team of 4; compressed viewfinder frames go through Bedrock (Nova Lite) and structured JSON commands are parsed from multimodal responses.',
            'Custom brightness / contrast / saturation pipeline on React Native Skia color matrices, since expo-image-manipulator lacked low-level pixel ops.',
        ],
        color: '#fbbf24',
        orbit: 11,
        ecc: 0.15,
        tilt: -0.1,
        phase: 5.4,
        shape: 'dodecahedron',
        solidScale: 1.5,
        rotSpeed: 1.2,
    },
    {
        id: 'legenesis',
        key: 'legenesis',
        label: 'LeGenesis',
        kind: 'Hackathon · sketch to 3D',
        date: 'Mar 2026',
        summary: 'Draw a concept, watch an AI-generated 3D model appear beside it.',
        stack: ['React', 'React Three Fiber', 'FastAPI', 'Supabase', 'MeshyAI', 'uAgents'],
        bullets: [
            'Split-screen sketch canvas with live 3D preview.',
            'FastAPI backend over MeshyAI text-to-image and image-to-3D, with a stateless context-token system for fast iterative edits.',
            'Agentic layer (Fetch.ai uAgents) routes prompts through single-view or multi-view pipelines by speed/quality tradeoff.',
        ],
        color: '#f472b6',
        orbit: 13.5,
        ecc: 0.1,
        tilt: 0.16,
        phase: 1.3,
        shape: 'tetrahedron',
        solidScale: 1.4,
        rotSpeed: 1.1,
    },
];

export const experience = [
    {
        role: 'Full-Stack Web Developer & Consultant',
        org: "Peter's Home Solution · Freelance",
        place: 'Calgary, AB',
        date: 'Sept 2026 – now',
        project: 'peters',
    },
];

export const skills: { label: string; sym: string; items: string[] }[] = [
    { label: 'Programming', sym: '</>', items: ['Python', 'C/C++', 'Java', 'TypeScript', 'JavaScript', 'SQL', 'React', 'React Native', 'FastAPI', 'Flask'] },
    { label: 'Quantitative', sym: '∫', items: ['Signal Processing', 'Spectral Analysis', 'Time Series Modelling', 'Backtesting', 'Market Microstructure'] },
    { label: 'Machine Learning', sym: '∇', items: ['PyTorch', 'scikit-learn', 'Autoencoders', 'Anomaly Detection', 'Gradient-based Optimization'] },
    { label: 'Mathematical', sym: 'Σ', items: ['Linear Algebra', 'Numerical Methods', 'Probability', 'Dynamical Systems'] },
    { label: 'Systems & Tools', sym: '$_', items: ['Linux', 'Git', 'Docker', 'AWS', 'Google Cloud Run', 'Raspberry Pi', 'systemd', 'NeoVim'] },
];
