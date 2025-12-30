export const LiquidFilter = () => (
  <svg xmlns="http://www.w3.org/2000/svg" style={{ display: 'none' }}>
    <defs>
      <filter id="glass-filter" colorInterpolationFilters="sRGB">
        <feGaussianBlur stdDeviation="8" edgeMode="duplicate" />
        <feComponentTransfer>
          <feFuncA type="linear" slope="1.5" />
        </feComponentTransfer>
      </filter>
    </defs>
  </svg>
);
