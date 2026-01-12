I will implement the **MOBILE-ONLY** glow-up using the **exact classes provided**, ensuring **zero impact** on desktop.

### **Phase 1: Mobile Background**
**File:** [app/layout.tsx](file:///Users/mrrobot13/Desktop/basedarestar/basedare/app/layout.tsx)
-   **Action:** Update the existing mobile background div with the void gradient and cyber grid.
-   **Code Plan:**
    ```tsx
    // Before
    <div className="fixed inset-0 -z-50 pointer-events-none bg-gradient-to-b from-black via-[#050510] to-black md:hidden" />

    // After
    <div className="fixed inset-0 -z-50 pointer-events-none bg-gradient-to-b from-black via-[#050510] to-black bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)] md:bg-transparent md:bg-none md:hidden" />
    ```
    *   `md:bg-transparent md:bg-none`: Explicitly removes background styles on desktop.
    *   `md:hidden`: Removes the element entirely on desktop.

### **Phase 2: Mobile Layout**
**File:** [app/page.tsx](file:///Users/mrrobot13/Desktop/basedarestar/basedare/app/page.tsx)
-   **Action:** Add safe padding to the main content wrapper.
-   **Code Plan:**
    ```tsx
    // Before
    <div className="w-full flex flex-col items-center relative z-20">

    // After
    <div className="w-full flex flex-col items-center relative z-20 p-6 md:p-0">
    ```
    *   `md:p-0`: Restores 0 padding on desktop, protecting the original layout.

### **Phase 3: Mobile-Only Sticky Header**
**File:** [app/page.tsx](file:///Users/mrrobot13/Desktop/basedarestar/basedare/app/page.tsx)
-   **Action:** Insert the sticky header for mobile only.
-   **Code Plan:**
    ```tsx
    // Insert inside fan-view, top of container
    <div className="sticky top-0 z-50 flex md:hidden items-center justify-between w-full px-6 py-4 bg-black/80 backdrop-blur-xl border-b border-white/10">
      <span className="text-[#FFD700] font-black italic tracking-tighter text-xl">BASEDARE</span>
    </div>
    ```
    *   `md:hidden`: Ensures this header does not exist on desktop.

### **Phase 4: Truth Card Scaling**
**File:** [components/TruthProtocol.tsx](file:///Users/mrrobot13/Desktop/basedarestar/basedare/components/TruthProtocol.tsx)
-   **Action:** Apply width scaling to Truth Protocol cards.
-   **Code Plan:**
    ```tsx
    // Before
    className="w-full"

    // After
    className="w-full md:w-auto max-w-full md:max-w-[600px]"
    ```
    *   `md:w-auto`: Restores grid-based sizing on desktop.
    *   `md:max-w-[600px]`: Applies the specific desktop constraint requested.
