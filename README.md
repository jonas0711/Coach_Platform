# Next.js Boilerplate

En moderne, komplet og veldokumenteret startup skabelon til Next.js projekter med Shadcn UI og DaisyUI. Designet til hurtig udvikling af webapplikationer.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 🚀 Teknologier og Features

Denne boilerplate er bygget med de nyeste og mest populære teknologier inden for moderne webudvikling:

### Frontend Framework
- **[Next.js 15](https://nextjs.org/)** - Et React-framework med server-side rendering, statisk site generering og App Router
- **[React 19](https://react.dev/)** - Den seneste version af React biblioteket
- **[TypeScript](https://www.typescriptlang.org/)** - Stærkt typet JavaScript for bedre udvikleroplevelse

### Styling og UI
- **[Tailwind CSS](https://tailwindcss.com/)** - Et utility-first CSS-framework for hurtig styling
- **[Shadcn/UI](https://ui.shadcn.com/)** - Genbrugelige UI-komponenter bygget med Radix UI og Tailwind
- **[DaisyUI](https://daisyui.com/)** - Komponentbibliotek til Tailwind CSS for hurtig prototyping
- **[Next-themes](https://github.com/pacocoursey/next-themes)** - Tema support med mørk/lys mode

### Formular og Validering
- **[React Hook Form](https://react-hook-form.com/)** - Performant, fleksibel og udvidelig formular
- **[Zod](https://github.com/colinhacks/zod)** - TypeScript-first skemavalidering med statisk typeinferens

### Data Håndtering
- **[TanStack Query](https://tanstack.com/query/latest)** - Asynkron tilstands- og cachestyring
- **[Axios](https://axios-http.com/)** - Promise-baseret HTTP-klient
- **[Zustand](https://github.com/pmndrs/zustand)** - Letvægts-tilstandshåndtering
- **[Jotai](https://jotai.org/)** - Primitiv og fleksibel tilstandshåndtering

### Developer Experience
- **ESLint** - Linting for JavaScript og TypeScript
- **Specifikke ESLint plugins** - For import og unused imports
- **Organiseret mappestruktur** - Velstruktureret projekt for skalerbarhed

## 📁 Mappestruktur

```
/
├── app/                   # Next.js App Router filer
│   ├── api/               # API endpoints
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Forside
│   └── globals.css        # Globale stilarter
├── components/            # React komponenter
│   ├── ui/                # UI komponenter fra Shadcn
│   ├── layout/            # Layout komponenter
│   └── forms/             # Formular komponenter
├── hooks/                 # Custom React hooks
├── lib/                   # Hjælpefunktioner og utilities
├── providers/             # React kontekst providere
├── types/                 # TypeScript typedeklarationer
├── public/                # Statiske filer
│   └── ...
└── ... konfigurationsfiler
```

## 🛠️ Inkluderede Komponenter

Denne boilerplate kommer med følgende Shadcn komponenter præinstalleret:

- **Button** - For forskellige typer af knapper
- **Card** - Kortkomponent med header, indhold og footer
- **Form** - Avanceret formularkomponent med React Hook Form integration
- **Input** - Inputfelt med styling
- **Dialog** - Modal/popup dialog
- **Dropdown Menu** - Menu med dropdown funktionalitet

## 📋 Forudsætninger

Før du begynder, sørg for at du har følgende installeret:

- Node.js (version 18.17.0 eller nyere)
- npm, yarn, eller pnpm

## 🔧 Sådan kommer du i gang

### Metode 1: Brug GitHub's Template Funktion (Anbefalet)

Dette repository er konfigureret som et GitHub Template Repository, hvilket gør det nemt at starte et nyt projekt.

1. Gå til [https://github.com/jonas0711/template](https://github.com/jonas0711/template)
2. Klik på den grønne "Use this template" knap
3. Vælg "Create a new repository"
4. Udfyld informationen for dit nye projekt
5. Klik på "Create repository from template"
6. Klon dit nye repository til din lokale maskine:
   ```bash
   git clone https://github.com/DIT_BRUGERNAVN/DIT_NYE_PROJEKT.git
   cd DIT_NYE_PROJEKT
   ```
7. Installer dependencies:
   ```bash
   npm install
   ```
8. Start udviklingsserveren:
   ```bash
   npm run dev
   ```
9. Åbn [http://localhost:3000](http://localhost:3000) i din browser

### Metode 2: Manuel Kloning og Opsætning

1. Klon dette repository:
   ```bash
   git clone https://github.com/jonas0711/template.git mit-projekt
   cd mit-projekt
   ```

2. Fjern forbindelsen til det oprindelige repository:
   ```bash
   git remote remove origin
   ```

3. (Valgfrit) Tilføj dit eget remote repository:
   ```bash
   git remote add origin https://github.com/DIT_BRUGERNAVN/DIT_REPOSITORY.git
   ```

4. Installer dependencies:
   ```bash
   npm install
   ```

5. Start udviklingsserveren:
   ```bash
   npm run dev
   ```

6. Åbn [http://localhost:3000](http://localhost:3000) i din browser

## 📝 Brug af Boilerplaten

### Struktur og Organisering

- **Sider** placeres i `/app` mappen (App Router)
- **Komponenter** opdeles i:
  - `/components/ui`: For rene UI-komponenter
  - `/components/layout`: For layout-komponenter
  - `/components/forms`: For formular-relaterede komponenter

### Tilføjelse af nye Shadcn Komponenter

For at tilføje flere Shadcn komponenter:

```bash
npx shadcn@latest add KOMPONENT_NAVN
```

For eksempel, for at tilføje en Table komponent:

```bash
npx shadcn@latest add table
```

### Brug af DaisyUI

DaisyUI er allerede konfigureret i `tailwind.config.js`. Du kan bruge DaisyUI's klasser direkte i dine komponenter:

```jsx
<button className="btn btn-primary">DaisyUI Button</button>
```

### Tema Understøttelse

Boilerplaten understøtter mørk/lys tema via Next-themes og ThemeProvider. Brug `ModeToggle`-komponenten til at skifte mellem temaer.

## 📈 Scripts

- `npm run dev` - Start udviklingsserver (med Turbopack for hurtigere builds)
- `npm run build` - Byg til produktion
- `npm run start` - Kør produktionsbuild
- `npm run lint` - Kør ESLint

## 🤝 Bidrag

Bidrag, problemer og feature-anmodninger er velkomne! Tjek problemer siden på GitHub.

## 📄 Licens

Distribueret under MIT-licensen. Se `LICENSE` for mere information.

## 👨‍💻 Udviklet af

- [Jonas Holm](https://github.com/jonas0711)

---

Dette projekt blev bootstrappet med [create-next-app](https://nextjs.org/docs/app/api-reference/cli/create-next-app) og udvidet med Shadcn UI og DaisyUI for en optimal udvikleroplevelse.
