// The Tutorials section's words (Figma User Panel V2 › Tutorial). Six
// categories, in the owner's Figma order; each page describes what the app
// really does today, in the words its screens use. Video slots carry no file
// yet (owner D1): the owner sends them, and each pays 2 IDZ once (D2).
//
// Data only, with relative imports, so node:test reads the same content.

import type { TutorialBlock, TutorialCategory } from "./types";

const VIDEO_REWARD = "2";

const p = (text: string): TutorialBlock => ({ kind: "paragraph", text });
const h2 = (text: string): TutorialBlock => ({ kind: "heading", level: 2, text });
const list = (...items: string[]): TutorialBlock => ({ kind: "list", items });
const video = (id: string, title: string): TutorialBlock => ({ kind: "video", id, title, reward: VIDEO_REWARD });

export const TUTORIAL_CATEGORIES: readonly TutorialCategory[] = [
  // ── 1 · IDEEZA ────────────────────────────────────────────────────────────
  {
    slug: "ideeza",
    title: "IDEEZA",
    description: "What IDEEZA is, how an idea becomes a product, and how every project splits into Build and Earn.",
    cover: { src: "/tutorials/covers/ideeza.jpg", alt: "Laptops, keyboards and coffee on a shared work table, seen from above" },
    topics: [
      {
        slug: "introduction",
        title: "Introduction",
        summary: "What IDEEZA is, what a build gives you, and where everything lives in the app.",
        blocks: [
          p(
            "IDEEZA helps you turn an electronics idea into a product you can build, share and sell. You describe what you want in plain words. AI draws concepts and builds the design files, you refine them in the editors, and when you are ready you put the project out into the world.",
          ),
          video("ideeza/introduction/1", "A quick tour of IDEEZA"),
          h2("What is IDEEZA?"),
          p(
            "IDEEZA is a hardware creation platform that runs in your browser. You do not need to know how to draw a circuit board to start. A sentence such as “a pocket air-quality monitor with a small screen” is enough to begin.",
          ),
          p(
            "Each build gives every product five pieces: a 3D model, a PCB, firmware code, wiring and a parts list. Each piece opens in its own editor, so you can change anything the AI made.",
          ),
          h2("Where things live"),
          p("The sidebar on the left takes you everywhere:"),
          list(
            "Home: describe an idea and start a project.",
            "History: your past concept chats and builds.",
            "My projects: every project you have saved.",
            "Parts & agile module: the parts catalogue and reusable blocks of parts.",
            "Explore marketplace: projects and copies that are for sale.",
            "Innovations: projects that creators have shared.",
            "Blog and Messages: write articles and talk with other creators.",
          ),
          h2("Good to know before you start"),
          p(
            "There is no sign-in yet. Your projects, profile and wallet are kept in this browser, so come back in the same browser to find them. The wallet, minting and the marketplace are a testnet demo, so nothing you do there uses real money or a real blockchain.",
          ),
        ],
      },
      {
        slug: "from-idea-to-product",
        title: "From idea to product",
        summary: "The four stages every project moves through: prompt, concepts, build and earn.",
        blocks: [
          p(
            "Every project in IDEEZA follows the same path. Once you know the stages, it is easy to see where you are and what comes next. The panel beside your chat shows them as Idea, Concepts, Build and Save.",
          ),
          video("ideeza/from-idea-to-product/1", "Following one idea from prompt to saved project"),
          h2("Prompt"),
          p(
            "On Home, choose Generate with AI and describe your idea. Before anything is drawn, IDEEZA asks which products the idea needs and which project they belong to. Nothing is charged until you answer. If you would rather design it yourself, choose Build manually and start with an empty project.",
          ),
          h2("Concepts"),
          p(
            "IDEEZA draws a concept image for each product, with a short spec of what will be built: its size, how it is powered and the parts that matter. Editing the spec is free. Refining or redrawing the image costs 1 credit.",
          ),
          h2("Build"),
          p(
            "When the concepts look right, you book a build. It costs 4 credits per product and usually takes about a minute. It runs inside the same chat, and the Build log records each step. When it is ready, you review the five pieces and save the project.",
          ),
          h2("Earn"),
          p(
            "A saved project opens on its project page. From there you keep working in the editors, or open Earn to mint the project, list it on Explore marketplace and follow its sales. Minting and selling are a testnet demo.",
          ),
        ],
      },
      {
        slug: "build-and-earn",
        title: "Build and Earn: the two halves of a project",
        summary: "Why every project has an engineering side and a money side, and how to move between them.",
        blocks: [
          p(
            "Every project has two halves. Build is the engineering: the products, their files and how they work together. Earn is everything that makes money from the project. Keeping them apart means you can keep designing without touching a sale, and manage a sale without digging through files.",
          ),
          video("ideeza/build-and-earn/1", "Moving between a project's Build and Earn sides"),
          h2("The Build side"),
          p(
            "The project page is the Build side. Its tabs are Products, Media, Network and Team. Products holds each product, with its own page and editors. Media holds the videos and images. Network shows how the products talk to each other, and Team lists the people working on the project.",
          ),
          h2("The Earn side"),
          p("Press Earn in the project page header to open the money side. Only the project's owner can open it. It has four tabs:"),
          list(
            "Overview: where you are on the path from Mint to Sell, and what to do next.",
            "Sell: the Main NFT, plus Physical and Virtual copies, each listed on its own.",
            "Business plan: a plan written by AI that you can edit and keep versions of.",
            "Money: ownership splits, sales and payouts, and your legal rights.",
          ),
          h2("Where the two halves meet"),
          p(
            "On a draft project the header also shows Publish. It asks once how the project goes out: kept private, given to the community, or sold. Selling can reach back into Build, too. If a project is listed, editing it asks you to pause the listing first, and once a project is sold in full it locks and becomes read-only.",
          ),
        ],
      },
    ],
  },

  // ── 2 · Set Up IDEEZA ─────────────────────────────────────────────────────
  {
    slug: "set-up-ideeza",
    title: "Set Up IDEEZA",
    description: "Set up your creator profile, connect the demo wallet, and choose a plan with the AI credits you need.",
    cover: { src: "/tutorials/covers/set-up-ideeza.jpg", alt: "Hands holding smartphones" },
    topics: [
      {
        slug: "creator-profile",
        title: "Your creator profile",
        summary: "Fill in your public profile so other creators know who you are and what you build.",
        blocks: [
          p(
            "Your creator profile is the page people see when they select your name anywhere in IDEEZA. It shows who you are and the work you have made public.",
          ),
          video("set-up-ideeza/creator-profile/1", "Filling in your creator profile"),
          h2("Open your profile"),
          list(
            "At the bottom of the sidebar, select your name to open the account menu.",
            "Choose My profile.",
            "Press Edit profile.",
          ),
          h2("Fill in the details"),
          p("Edit profile keeps every field in one place:"),
          list(
            "Cover and Photo: upload a picture. It is resized on your device.",
            "Name, and Name in English letters if your name uses another script.",
            "Headline: one line on what you build. Suggest from my work drafts one from the projects you have shared, and you choose Use this or Discard.",
            "About, Location and up to five links.",
            "Open to: whether you welcome questions, collaboration, or both.",
          ),
          p("Press Save profile when you are done."),
          h2("What other people see"),
          p(
            "Your profile only shows work that is already public: projects you shared to Innovations, or projects with a live listing. Drafts and private projects never appear. Under Edit profile, a short Only you see this list counts your public and private projects.",
          ),
          h2("Your account menu"),
          p(
            "The same account menu shows your plan, your credit balance and your level. It also holds Appearance, where you choose Light, Dark or Match system. There is no sign-in yet, so your profile is saved in this browser.",
          ),
        ],
      },
      {
        slug: "wallet-and-idz",
        title: "Wallet and IDZ (testnet demo)",
        summary: "Connect the demo wallet, switch demo accounts, and see what IDZ is for. No real money is involved.",
        blocks: [
          p(
            "IDEEZA uses a wallet to sign mints, list projects and pay for credits. In this app the wallet is a testnet demo. It holds test funds only. Nothing here is real money, and nothing is written to a real blockchain.",
          ),
          video("set-up-ideeza/wallet-and-idz/1", "Connecting the demo wallet"),
          h2("Connect the demo wallet"),
          list(
            "At the bottom of the sidebar, select the wallet button. Once a wallet is connected, it shows your IDZ balance.",
            "In the menu, choose Connect wallet. The Demo wallet window opens.",
            "Press Connect demo wallet.",
          ),
          p(
            "Once connected, the window shows your address, the three demo accounts you can switch between, the test network you are on (Base Sepolia or Mumbai), and what you have recently signed or paid. It also lists three demo creators, Mira, Leo and Sam. Connect their wallets when you want to try buying on Explore marketplace.",
          ),
          h2("What IDZ is for"),
          p(
            "IDZ is IDEEZA's token. Each demo account starts with 2,000 test IDZ, plus a little test ETH and MATIC for network fees. You can pay for AI credits and plans in IDZ or USDT. IDZ has one demo price, about $0.025 for 1 IDZ, so a $10 pack costs about 400 IDZ.",
          ),
          h2("Your IDZ in the wallet menu"),
          list(
            "Overview opens Balance, with your IDZ, what it is worth in dollars, and every IDZ that came in or went out.",
            "Buy $IDZ opens the demo presale.",
            "Earn IDZ tokens brings you here: each tutorial video pays 2 IDZ into your demo wallet once you have watched it to the end.",
            "Stake and Claim rewards are marked Soon.",
          ),
          h2("Signing and paying"),
          p(
            "Whenever you mint, list or buy, the wallet asks first. It shows what is about to happen and what it costs. Choose Sign, or Confirm and pay, to go ahead. Choose Reject and nothing is charged. Every record carries a Testnet demo label.",
          ),
          p("If this browser cannot read the wallet, the window offers Reset the demo wallet, which starts you again with fresh test funds."),
        ],
      },
      {
        slug: "plans-and-credits",
        title: "Plans and credits",
        summary: "How AI credits are spent, where to buy more, and what each plan gives you.",
        blocks: [
          p(
            "AI credits pay for the work AI does for you, such as drawing concepts and running builds. Plans add credits every month. You manage both in Settings, under Plan & billing.",
          ),
          video("set-up-ideeza/plans-and-credits/1", "Buying credits and choosing a plan"),
          h2("What costs credits"),
          list(
            "Drawing a concept costs 1 credit. Refine and Regenerate cost 1 credit each.",
            "A build costs 4 credits for each product in it.",
            "Editing a spec is free, and so is retrying one piece of a build that failed.",
          ),
          p(
            "If a drawing never arrives, its credit comes back. When your balance is too low, the button that needs credits says so and offers a way to buy more.",
          ),
          h2("Check your balance and buy credits"),
          p(
            "Select your name in the sidebar: the Credits card shows what you have left. Press Buy credits to go to Plan & billing, where you can buy a pack:",
          ),
          list(
            "Starter: 100 credits for $5.",
            "Pro: 500 credits plus 50 bonus for $10.",
            "Power: 1,000 credits plus 150 bonus for $20.",
          ),
          p(
            "You can also enter a custom amount of at least 50 credits. Credits you buy last 12 months, and IDEEZA always spends the ones that expire first.",
          ),
          h2("Choose a plan"),
          p(
            "The Upgrade card in the sidebar opens Pricing. It lists four plans, billed monthly or yearly with 20% off: Free with 10 AI credits a month, Tinkerer with 50 for $8 a month, Builder with 300 for $10, and Disruptor with 1,200 for $20. Bigger plans add a faster queue, room for more projects and contributors, and a discount on credit packs. No plan ever stands between you and minting, listing or selling.",
          ),
          h2("Paying in the demo"),
          p(
            "Card and PayPal are not available yet. In this demo you pay with test USDT or IDZ from the demo wallet, and Pay with in Plan & billing sets which one. Invoices keeps every payment with its invoice. Because the wallet is a testnet demo, no real money changes hands.",
          ),
        ],
      },
    ],
  },

  // ── 3 · First Product on IDEEZA ───────────────────────────────────────────
  {
    slug: "first-product",
    title: "First Product on IDEEZA",
    description: "Go from a one-line idea to a built, saved product, then share it with the community on Innovations.",
    cover: { src: "/tutorials/covers/first-product.jpg", alt: "A laptop and a cup of coffee on a table" },
    topics: [
      {
        slug: "start-from-a-prompt",
        title: "Start from a prompt",
        summary: "Describe your idea on Home and answer two short questions before anything is drawn.",
        blocks: [
          p(
            "Every AI project starts on Home with a sentence about what you want to make. You do not need technical words. Say what it does and who it is for.",
          ),
          video("first-product/start-from-a-prompt/1", "Writing your first prompt"),
          h2("Write the prompt"),
          list(
            "Open Home and make sure Generate with AI is selected.",
            "Describe your idea in the box, for example “a desk lamp that dims when you wave your hand”.",
            "Press Enhance if you want AI to rewrite it as a clearer brief. You can still edit it afterwards.",
            "Press Generate, or Enter. Shift+Enter starts a new line.",
          ),
          p(
            "Stuck for an idea? The suggestion chips under the box fill it in for you, and the round arrow button beside them shows three more. If your browser supports it, you can also dictate with the microphone.",
          ),
          h2("Answer the setup questions"),
          p("Your chat opens with a short question card, not a drawing. Nothing is charged until you answer."),
          list(
            "If your idea needs more than one product to work, such as a drone and its remote, What should we build? lists them. The product you described is always included. Tick the others you want.",
            "Then choose the project. A single product can join a project you already have, or pick + Start a new project and name it. Several products always start one new project, so you only give it a name.",
            "Press Start drawing. The card shows the cost first: 1 credit for each concept.",
          ),
          h2("Prefer to start by hand?"),
          p(
            "Choose Build manually on Home instead and press Create Project. You get an empty project and design every piece yourself in the editors. You can switch back to Generate with AI at any time.",
          ),
        ],
      },
      {
        slug: "choose-a-concept",
        title: "Choose a concept",
        summary: "Read each concept and its spec, change what you need, and pick the products that go into the build.",
        blocks: [
          p(
            "Once you answer the questions, IDEEZA draws a concept for each product. A drawing can take a little while, and the card shows how long it has been running. Each card is one product's latest drawing with its spec.",
          ),
          video("first-product/choose-a-concept/1", "Changing a concept before you build"),
          h2("Read the card"),
          p(
            "Under the picture, What will be built lists the facts that matter: the size, how it is powered, the radio it uses, and the part that does the main job. The panel on the left lists every product in the project with its progress, and the Build log below them.",
          ),
          h2("Change what you need"),
          list(
            "Edit spec opens the full spec sheet. Changing the spec is free.",
            "Refine asks for a change to the drawing, such as “make it matte black”. It costs 1 credit.",
            "Regenerate draws a fresh take that ignores the current image. It also costs 1 credit.",
            "You can type into the chat box too. A change goes to the product on screen, and a request such as “add a charger” draws a new product.",
          ),
          p("Concepts are numbered by where they came from, so Concept 1.1 is the first refine of Concept 1."),
          h2("Pick what goes into the build"),
          p(
            "Each card has an In build toggle and Remove. The product you first described shows Always built instead, because the project starts from it. Add a product draws another one for 1 credit. A product you removed can be put back for free, because its concept is kept.",
          ),
          h2("When you are ready"),
          p(
            "Under the products, the build button reads Build this product, or Build 3 products, with its price. It waits until every chosen concept has finished drawing. The next page shows how to book the build.",
          ),
        ],
      },
      {
        slug: "book-a-build",
        title: "Book a build and read the build log",
        summary: "Start the build, follow it in the Build log, review the five pieces and save your project.",
        blocks: [
          p(
            "A build turns your concepts into real design files. It costs 4 credits per product and usually takes about a minute. You can leave while it runs, and IDEEZA tells you when it is ready.",
          ),
          video("first-product/book-a-build/1", "Booking your first build"),
          h2("Book the build"),
          list(
            "Press Build this product, or Build 3 products, under the concepts.",
            "Read the confirmation. It names the products, shows your credits before and after, and how long the build should take.",
            "Press Build.",
          ),
          p(
            "The confirmation also says that concept images are a visual reference, so the engineered output may differ from them, and that automated design checks run when the build finishes. If you are short of credits, Buy credits is right there.",
          ),
          h2("Follow the Build log"),
          p(
            "The panel beside the chat shows each product with a progress bar and how many of its five pieces are done. Under it, the Build log lists what happened, oldest first: your messages, each concept drawn or refined, Build started with its cost, and Build ready when it ends. A build that is still waiting for its turn can be cancelled from the same panel.",
          ),
          h2("Review the five pieces"),
          video("first-product/book-a-build/2", "Reviewing the build and saving the project"),
          p(
            "When the build is done, the card in the chat reads Build ready. Pick a product, then a tab: 3D model, PCB, Firmware code, Wiring or Parts. What this covers explains each piece. If one piece could not be generated, retry it from its own panel at no extra cost.",
          ),
          h2("Save the project"),
          p(
            "Press Save Project, give the project a name and a short description, and save. You land on your new project page. If the build is joining a project you already have, the button reads Add to project instead.",
          ),
        ],
      },
      {
        slug: "share-to-innovations",
        title: "Share to Innovations",
        summary: "Make a video for each product, mint the project, then post it to Innovations with your story.",
        blocks: [
          p(
            "Innovations is where creators share their projects. Sharing yours puts it on the Innovations page with your story, where people can appreciate it, save it and comment. A project needs a few things in place before it can be shared.",
          ),
          video("first-product/share-to-innovations/1", "Sharing your project to Innovations"),
          h2("Get ready to share"),
          list(
            "Make a video for every product. Open the project's Media tab and press Generate AI video beside each product. For now the clip is made in your browser from the product's image and a few lines of text, because the AI video model isn't connected yet.",
            "Mint the project. Press Publish on the project page and choose Keep private if you only want to share it. It is a free signature in the testnet demo, and the demo wallet asks you to sign.",
            "Confirm that you are the rightful owner of the idea when IDEEZA asks.",
          ),
          h2("Share it"),
          list(
            "On the project page, open the ⋯ menu and choose Share to Innovations.",
            "Check that every product's video shows as ready.",
            "Write your story, up to 500 characters: why you built it, and what others could do with it.",
            "Press Share to Innovations.",
          ),
          p(
            "If the project isn't minted yet, the same menu item takes you to the mint first. You can also share while you mint: tick Share to Innovations in the Details step and write your story there.",
          ),
          h2("After it is live"),
          p(
            "The ⋯ menu now reads View post. On your post, a bar at the top shows that visitors see it this way, with Edit post, Stop sharing and Open project. The status beside the title is your project's current Activity, so keep your Activity up to date.",
          ),
        ],
      },
    ],
  },

  // ── 4 · Parts Vs Agile Modules ────────────────────────────────────────────
  {
    slug: "parts-vs-agile-modules",
    title: "Parts Vs Agile Modules",
    description: "Find parts in the library, place ready-made Agile Modules, and learn when each one fits best.",
    cover: { src: "/tutorials/covers/parts-vs-agile-modules.jpg", alt: "An angular metal facade, panel after panel" },
    topics: [
      {
        slug: "parts-library",
        title: "The parts library",
        summary: "Search the parts catalogue, read a part's details, and add packages of your own.",
        blocks: [
          p(
            "The parts library holds every component IDEEZA knows about. Open Parts & agile module in the sidebar to browse it, or to look a part up before you use it.",
          ),
          video("parts-vs-agile-modules/parts-library/1", "Finding a part in the library"),
          h2("Find a part"),
          p(
            "Type in the search box to look for a part number, package, manufacturer or feature, such as 0402 or USB-C. The rail on the left narrows the list:",
          ),
          list(
            "All parts shows the whole catalogue.",
            "By kind groups the parts, such as Resistors, Capacitors, Diodes and ICs.",
            "Yours holds Agile Modules and My packages.",
          ),
          p(
            "Each row shows the part number, its package, maker and features, and the price on the right. The two view buttons switch between this list and a grid of cards.",
          ),
          h2("Read a part's page"),
          p(
            "Select a row to open the part. Its page shows the schematic symbol, manufacturer, package, price and stock, and for most packages the land pattern: the copper pads the part needs on the board. Where IDEEZA does not know something, the page says so rather than guessing.",
          ),
          p(
            "You place a part from inside the editor, with Insert › Place a Part. Open the board, on the part's page, takes you to the board of the project you have open.",
          ),
          h2("Add your own package"),
          p(
            "If a part is missing, press New package. It walks you through five steps, Package, Symbol, Footprint, 3D Place and Finalize, with three ways in: Import KiCad files you already have, the Part Wizard for standard families, or Custom Part Creation on a blank canvas. Your package is saved in this browser under My packages, and you can place it from the Personal list in Place a Part.",
          ),
        ],
      },
      {
        slug: "what-is-an-agile-module",
        title: "What an Agile Module is",
        summary: "An Agile Module is a ready-made block of parts that you place on a schematic in one step.",
        blocks: [
          p(
            "Most circuits reuse the same small blocks: a USB-C power input, a voltage regulator, a microcontroller with its support parts. An Agile Module is one of those blocks, saved so you can drop it into a schematic in one step instead of placing each part again.",
          ),
          video("parts-vs-agile-modules/what-is-an-agile-module/1", "Placing an Agile Module on a schematic"),
          h2("Modules that come with IDEEZA"),
          list(
            "USB-C Power Input: 5 V input with ESD and bulk decoupling.",
            "ESP32-C3 Core: a microcontroller with boot strapping, decoupling and antenna keep-out.",
            "Buck 5 V → 3V3: an adjustable regulator with its feedback divider.",
            "High-Side Current Sense: a shunt and amplifier scaled for 0 to 3 A.",
            "Level Shifter 3V3 ⇄ 5 V: a bidirectional MOSFET pair with pull-ups.",
          ),
          p(
            "Open Agile Modules in the parts library to see them. A module's page lists the parts it is built from, and each part links to its own page.",
          ),
          h2("Place a module"),
          list(
            "Open a product's PCB Design editor, with Schematic selected at the top.",
            "Press Agile Module in the toolbar. The Parts & Agile Module window opens on its Agile Module tab.",
            "Search, or filter by feature, then press Place.",
          ),
          p(
            "A module from the catalogue lands as one block that carries its name. A module you captured yourself places every object it holds, keeping their layout.",
          ),
          h2("Capture your own"),
          list(
            "On the schematic, select the parts and wires that make up the block.",
            "Open the Project menu, choose New, then Agile Module.",
            "Give it a name and press Save module.",
          ),
          p(
            "Your module appears in the Agile Module tab and under Agile Modules in the parts library. Like your packages, it is kept in this browser.",
          ),
        ],
      },
      {
        slug: "when-to-use-which",
        title: "When to use which",
        summary: "Use single parts for one job, and Agile Modules for blocks you build the same way every time.",
        blocks: [
          p(
            "Parts and Agile Modules both end up on your schematic. The difference is size: a part is one component, and a module is a working group of them. Choosing the right one saves time and avoids mistakes.",
          ),
          video("parts-vs-agile-modules/when-to-use-which/1", "Choosing between a part and a module"),
          h2("Reach for a part when"),
          list(
            "You need one specific component, such as a resistor or a particular connector.",
            "You want to swap a part the build chose for one with a different package or maker.",
            "The circuit around it is new, so there is no block to reuse yet.",
          ),
          p(
            "In the editor, use Insert › Place a Part. Its rail switches between System, the full catalogue, and your own lists: Recent, Personal, Favorite and Project. Filter by Package, Manufacturer and Feature, and star a part to keep it under Favorite.",
          ),
          h2("Reach for a module when"),
          list(
            "The block is always built the same way, like a power input or a regulator.",
            "You got a block right on one product and want it on the next.",
            "You want fewer loose parts on the sheet.",
          ),
          h2("A simple habit"),
          p(
            "Build a block from single parts the first time. Once it works and passes the electrical check, capture it as an Agile Module. From then on, place the module, and keep single parts for the jobs that are new. If a part is not in the catalogue at all, add it with New package in the parts library.",
          ),
        ],
      },
    ],
  },

  // ── 5 · In Depth Analysis on Project ──────────────────────────────────────
  {
    slug: "in-depth-analysis",
    title: "In Depth Analysis on Project",
    description: "A close look at the project page: its products, Activity, Network, and how Main, Physical and Virtual sales work.",
    cover: { src: "/tutorials/covers/in-depth-analysis.jpg", alt: "A keyboard glowing in blue light" },
    topics: [
      {
        slug: "project-page",
        title: "The project page",
        summary: "What each part of the project page shows, and where to find it.",
        blocks: [
          p(
            "Every saved project has its own page. Open My projects in the sidebar and select a card: the whole card is one link to its project. The project page is the Build side, showing what you made and how it is going.",
          ),
          video("in-depth-analysis/project-page/1", "A tour of the project page"),
          h2("The header"),
          p(
            "At the top you see the name, a stage line such as Built · 3 products · v2, when it was saved, and the description. The buttons beside it depend on where the project is: Review version when a newer build is waiting, Publish on a draft, and Earn to open the money side. The ⋯ menu holds Edit name and description, Share to Innovations and Delete project.",
          ),
          h2("The tabs"),
          list(
            "Products: a tile for each product, and Add a product.",
            "Media: each product's video first, then the images.",
            "Network: how the products talk to each other.",
            "Team: everyone on the project, with their role.",
          ),
          h2("The side panel"),
          p(
            "On the right, Activity shows the project's current stage and lets you add the next one. About lists the facts: when it was created, how many parts it uses, its network, its team, and that it is stored in this browser. Versions lists the builds behind the project, and Recent shows the latest events, such as minted or listed.",
          ),
          h2("Back in My projects"),
          p(
            "My projects lists every project, with the tabs All, Draft, Minted, Listed and Sold, a Showcase only filter, search and sort. Each card shows its status and a hint about the next step, such as Next: mint.",
          ),
        ],
      },
      {
        slug: "products-inside-a-project",
        title: "Products inside a project",
        summary: "Open a product's own page, see its pieces, and add more products to a project.",
        blocks: [
          p(
            "A project can hold one product or several, such as a drone, its remote and a charger. Each product has its own page, its own files and its own editors, so a change to one never touches the others.",
          ),
          video("in-depth-analysis/products-inside-a-project/1", "Opening a product's page"),
          h2("A product's page"),
          p(
            "Select a product on the Products tab. Its tabs show what the build made: Media, 3D model, PCB, Firmware code, Wiring and Parts. A product you made by hand has Media only until you design it in the editors.",
          ),
          p(
            "The header says how many pieces are ready and lets you pick a version. Open in editor takes you straight into the editors. The Editor panel on the right has a row for each module: PCB Design, Code, 3D Module, Assembly, Peripheral Wiring and Product Preview.",
          ),
          h2("Add a product"),
          list(
            "On the Products tab, press the Add a product tile.",
            "Choose Build with AI to describe it and go through concepts and a build, or Build manually to start an empty product in the editors.",
            "The new product joins this project. Adding a product never starts a new project.",
          ),
          h2("Versions of a project"),
          p(
            "If you change a concept after a build and press Build again, saving that build offers Save version 2 instead of a new project. While a newer version waits, the project page shows Review version. A product the new version leaves out stays listed, marked as not in that version.",
          ),
        ],
      },
      {
        slug: "activity-and-network",
        title: "Activity and Network",
        summary: "Record each real step of your project with proof, and map how its products connect.",
        blocks: [
          p(
            "Two parts of the project page tell people how a project is going and how it works. Activity is its journey. Network is how its products talk to each other.",
          ),
          video("in-depth-analysis/activity-and-network/1", "Adding an Activity entry with proof"),
          h2("Add to the Activity"),
          p("Every project and product starts at Planning. Each time something real happens, add it:"),
          list(
            "In the Activity panel on the right of the project page, press + Add.",
            "Choose an Activity Type, such as Design, Prototype, Testing, Certification or Launched. Others lets you name the stage yourself.",
            "Say what happened at this stage.",
            "Attach at least one photo, video, PDF or document as proof, then press Add Now.",
          ),
          p(
            "The newest entry becomes the project's current status. It shows on the project page, on your Innovations post and to buyers, and History lists every entry. Activity for the NFTs you sell lives in Earn › Sell, beside each NFT.",
          ),
          h2("Set up the Network"),
          video("in-depth-analysis/activity-and-network/2", "Creating a network for your products"),
          p(
            "A network records which products in the project talk to each other, over which protocol, and what each one does. If you added a network in the chat while drawing concepts, saving the project saved it too. Otherwise open the Network tab and press Create Network:",
          ),
          list(
            "Setup: pick a goal, such as Products talk to each other or Control all via 1 App, and the products to include.",
            "Method: AI Auto-Map proposes the links for you, or Manual Canvas lets you draw them.",
            "Connect and Review: adjust the links and check each product's settings, then press Create network.",
          ),
          p("View Network opens the Connection Map. There, Edit map changes the links, and Settings changes the whole network or deletes it."),
        ],
      },
      {
        slug: "selling",
        title: "Selling: Main, Physical and Virtual",
        summary: "The three things you can sell from a project, and how each one is listed. Testnet demo only.",
        blocks: [
          p(
            "When a project is ready, Earn › Sell is where you put it on sale. Everything here is a testnet demo: listings, sales and payouts use test funds, and listing something never promises you income.",
          ),
          video("in-depth-analysis/selling/1", "Listing a project on Explore marketplace"),
          h2("Three things you can sell"),
          list(
            "Main NFT: the project itself. Whoever buys it gets everything inside it: every product, file and version. Whole project only.",
            "Physical NFT: a built unit. You make each one and ship it to the buyer. Whole project or one product.",
            "Virtual NFT: the design files with a licence. Buyers download them. Whole project or one product.",
          ),
          p(
            "Each one is listed on its own. You can sell Physical or Virtual copies without listing the Main NFT, and copies never sell the project itself.",
          ),
          h2("Selling the Main NFT"),
          p(
            "Under Whole project, press Sell on the Main NFT row. If the project is not minted yet, this opens the mint, which lists the project as it mints. Choose Buy now or Auction, then set the token and price, the selling percentage and the royalties, a share of resales if marketplaces honour it. Selling the Main NFT sells the project: once all of it is sold, the buyer owns everything, your copy listings stop and the project locks.",
          ),
          h2("Selling copies"),
          video("in-depth-analysis/selling/2", "Selling Physical and Virtual copies"),
          p(
            "Whole project has its own Physical and Virtual rows, and One product at a time lists them again for each product. Press Sell to open two steps: Copies and price, then Review. For physical copies you also describe how you will make and ship them. Press Sign and sell to create the copies and list them. Physical copies also ask for a demo identity check.",
          ),
          p("If something is missing, such as a license or a product video, the row lists it under Before you can list, with a fix for each."),
          h2("Fees and payouts"),
          p(
            "IDEEZA takes a 2.5% fee from every sale, and the forms show what you get from each one. Buyers find your listings on Explore marketplace. Your sales appear in Earn › Money, where Request payout (demo) records a payout request and sends nothing.",
          ),
        ],
      },
    ],
  },

  // ── 6 · Code (Tech) ───────────────────────────────────────────────────────
  {
    slug: "code-tech",
    title: "Code (Tech)",
    description: "Work in the editors: place and route the PCB, run design checks, edit firmware and shape the 3D model.",
    cover: { src: "/tutorials/covers/code-tech.jpg", alt: "Laptops, keyboards and a phone on a shared work table, seen from above" },
    topics: [
      {
        slug: "introduction",
        title: "Introduction",
        summary: "How to open the editors, what each module does, and how your work is saved.",
        blocks: [
          p(
            "The editors are where you change what a build made, or design a product from scratch. Every product has its own set of editors, so changing the remote never touches the drone.",
          ),
          video("code-tech/introduction/1", "Opening a product in the editors"),
          h2("Open the editors"),
          list(
            "Open a project, then a product from its Products tab.",
            "Press Open in editor, or pick a module from the Editor panel on the right.",
          ),
          p(
            "A product that came from a build opens with its work already filled in: the schematic and board from the build's parts, the 3D scene, the firmware and the wiring. A banner says what came in, and IDEEZA never writes over work you have done yourself.",
          ),
          h2("The modules"),
          p("The rail down the left of the editor switches between modules:"),
          list(
            "PCB Design: the schematic and the circuit board.",
            "Code: the firmware, as blocks or as code.",
            "3D Module: the product's shape and case.",
            "Assembly, Peripheral Wiring and Product Preview: how the pieces fit together and look as one product.",
            "Add Brief: opens the mint for the project, in Earn.",
          ),
          h2("How your work is saved"),
          p(
            "The editors save as you go, in this browser. The top bar says so: Saving… while a change is being written, then Saved with the time, and Not saved · Retry if the browser refused it. Ctrl+S and File › Save save at once. When you build the product again, the Editor panel on the product page offers Load version, which brings the new build's files in after you confirm, and Restore version, which puts the earlier work back.",
          ),
        ],
      },
      {
        slug: "pcb-editor",
        title: "PCB editor",
        summary: "Draw the schematic, lay out the board, route its tracks and check it.",
        children: [
          {
            slug: "placing-parts",
            title: "Placing parts",
            summary: "Add parts to the schematic, connect them, and arrange them on the board.",
            blocks: [
              p(
                "A circuit starts on the schematic, the drawing of what connects to what. The board, where parts sit on real copper pads, is made from it. So you add and connect parts on the schematic first. A product from a build already has both filled in.",
              ),
              video("code-tech/placing-parts/1", "Placing and wiring parts on the schematic"),
              h2("Add a part to the schematic"),
              list(
                "In PCB Design, select Schematic at the top.",
                "Open the Insert menu and choose Place a Part.",
                "Search, or narrow the list with the Package, Manufacturer and Feature filters.",
                "Press Place. The part lands on the sheet, selected, with a designator such as R1 or C2.",
              ),
              h2("Connect the parts"),
              p(
                "Choose Wire in the tool palette on the left, or press Alt+W. Click to start a wire and click again to finish it. Esc cancels. Power symbols such as VCC and GND sit in the same palette under Power. To check the connections, choose Design › Run electrical check (ERC).",
              ),
              h2("From schematic to board"),
              p(
                "Select PCB at the top. The first time, the Convert schematic to PCB window lists every part with the footprint it will get. Press Convert to build the board: footprints placed near related parts, joined by thin airwires that show what still needs a track. After you change the schematic, Design › Import Changes From Schematic on the board brings the changes across.",
              ),
              h2("Arrange parts on the board"),
              p(
                "Drag a part to move it. With parts selected, the Position panel on the right aligns them, sets an exact X and Y, rotates them by 90° and flips them. Snap in the toolbar keeps parts on the grid.",
              ),
            ],
          },
          {
            slug: "routing",
            title: "Routing",
            summary: "Turn airwires into copper tracks, by hand or with Auto Routing.",
            blocks: [
              p(
                "Routing means drawing the copper tracks that join the pads on your board. Each thin airwire is a connection still waiting for its track.",
              ),
              video("code-tech/routing/1", "Routing a track by hand"),
              h2("Route a track by hand"),
              list(
                "On the PCB tab, open Route in the tool palette on the left and choose Single Route.",
                "Click where the track starts, usually on a pad.",
                "Click again where it ends. Esc cancels.",
              ),
              p("The dashed preview is the exact path the track will take, so what you see is what lands on the board."),
              h2("Bends, obstacles and width"),
              p("The Route menu at the top sets how new tracks behave:"),
              list(
                "Routing Corner: the shape of each bend, a line or an arc, held to 45°, 90° or a free angle.",
                "Routing Mode: Ignore obstacles draws straight through, Walk around obstacles detours around other copper, and Push obstacles shoves a blocking track aside when both paths stay clear.",
                "Routing Width: how wide new tracks are.",
              ),
              h2("Let Auto Routing do it"),
              p(
                "Route › Auto Routing opens a window where you choose what to route: Unrouted nets only, Selected nets, or All nets (re-route). You can also use each net's class track width, and mitre corners to 45°. Press Start Routing. The router lays one track per airwire on the top layer and does not move existing copper aside, so run the DRC afterwards.",
              ),
            ],
          },
          {
            slug: "design-rule-check",
            title: "Design rule check",
            summary: "Run the DRC to find spacing, width and connection problems before a board is made.",
            blocks: [
              p(
                "A design rule check, or DRC, reads the real geometry of your board and flags anything that breaks your rules: copper too close together, tracks too thin, or connections that do not join. Run it after routing, and again after every big change.",
              ),
              video("code-tech/design-rule-check/1", "Running a design rule check"),
              h2("Run the check"),
              list(
                "On the PCB tab, press DRC in the toolbar.",
                "The DRC tab opens in the panel at the bottom with every finding.",
                "Use the filters to show Fatal Error, Error, Warn or Info.",
                "Click a finding to see where it is on the board. Show on canvas marks them all at once.",
              ),
              h2("What it looks for"),
              list(
                "Spacing between copper on different nets, such as two tracks that sit too close.",
                "Track widths and via sizes outside the limits you set.",
                "Copper that belongs to no net, and nets whose pieces do not all join up.",
                "Net lengths, differential pairs, net classes and matched length groups, where you have set them.",
              ),
              h2("Set your own limits"),
              p(
                "Design › Design rules opens Board constraints. Limits holds the rules themselves, such as minimum spacing and track width, and Where they apply ties them to nets, net pairs or regions. The list shows which limits are checked by the engine today and which are not checked yet. Save & check now saves your changes and runs the DRC in one step.",
              ),
              h2("The schematic has its own check"),
              p(
                "On the schematic, the electrical rule check, or ERC, looks at connections instead of geometry. Run it from Design › Run electrical check (ERC), or press Run ERC in the bottom panel.",
              ),
            ],
          },
        ],
      },
      {
        slug: "firmware-code",
        title: "Firmware code",
        summary: "Read your product's firmware and change it as blocks or as code.",
        blocks: [
          p(
            "Firmware is the program that runs on your product's microcontroller. A build writes a first version for you as an Arduino sketch. You can read it on the product page and change it in the Code module.",
          ),
          video("code-tech/firmware-code/1", "Editing firmware in the Code module"),
          h2("Read what the build wrote"),
          p(
            "On the product page, the Firmware code tab shows the firmware the build made. A product with no microcontroller has nothing to run firmware on, so it gets none.",
          ),
          h2("Choose how you work"),
          p("Open Code from the editor rail. It asks you to choose one to continue:"),
          list(
            "Blockly development: build the program from blocks you drag into the workspace, such as if / do, repeat while and read pin. The code your blocks make appears beside them, in JavaScript or Python.",
            "Code Development: a full code editor with files and tabs, find and replace, and your build's firmware as one of the files.",
          ),
          p(
            "The Mode button at the top switches between the two. IDEEZA warns that switching discards your progress in the mode you leave, and asks you to confirm first.",
          ),
          h2("What it can't do yet"),
          p(
            "IDEEZA does not compile firmware or upload it to a board yet. Use the Code module to read, plan and edit your program. Your work is kept with the product in this browser. Back to PCB and Continue to 3D, at the bottom right, move you along the editors.",
          ),
        ],
      },
      {
        slug: "3d-and-enclosure",
        title: "3D and enclosure",
        summary: "Explore the 3D model a build makes, and shape your product in the 3D Module.",
        blocks: [
          p(
            "Every build makes a 3D model of each product: its board and parts inside a case. It helps you check the size and see how everything fits before anything is made.",
          ),
          video("code-tech/3d-and-enclosure/1", "Taking the 3D model apart"),
          h2("The model a build makes"),
          p(
            "Open the 3D model tab, in the build review or on the product page. The board is sized from the product's spec, the parts sit on it at their real body sizes, and the enclosure is a base with four board bosses and a lid, in the spec's material and wall thickness.",
          ),
          list(
            "Drag the Explode slider to pull the parts apart.",
            "Click a part to see its reference, quantity and system, then press Isolate this part to see it on its own.",
            "Turn whole systems on and off, such as Power or Sensing, in the panel beside the model.",
            "Use the toolbar to reset the view, fit, zoom and go fullscreen.",
          ),
          p("The parts are drawn as sized boxes, cans and chips, not as detailed models."),
          h2("Shape it in the 3D Module"),
          video("code-tech/3d-and-enclosure/2", "Adding and moving shapes in the 3D Module"),
          p(
            "Open 3D Module from the editor rail. A built product opens with its 3D scene. From the Shape Creation menu you can add basic shapes, such as Box, Sphere, Cylinder, Cone and Plane, then move, rotate and scale them. Sketch mode lets you draw a flat outline.",
          ),
          p(
            "Generate a 3D model with AI turns a short description into a model. When the 3D generator is not connected, it says so and shows a sample shape instead.",
          ),
        ],
      },
    ],
  },
];
