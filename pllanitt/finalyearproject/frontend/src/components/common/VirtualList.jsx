import React, { useState, useEffect, useRef, useMemo } from 'react';

/**
 * Virtual List Component
 * Renders only visible items for better performance with large datasets
 * 
 * @param {Array} items - Array of items to render
 * @param {Function} renderItem - Function to render each item (item, index) => ReactNode
 * @param {Number} itemHeight - Height of each item in pixels (fixed height) or 'auto' for dynamic
 * @param {Number} overscan - Number of items to render outside visible area
 * @param {String} className - Additional CSS classes
 */
const VirtualList = ({
  items = [],
  renderItem,
  itemHeight = 50,
  overscan = 5,
  className = '',
  containerHeight = 400,
  onScroll
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerRef, setContainerRef] = useState(null);
  const itemHeightsRef = useRef(new Map()); // For dynamic height calculation
  const [totalHeight, setTotalHeight] = useState(0);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    if (items.length === 0) return { start: 0, end: 0 };

    let start = 0;
    let end = items.length;
    let currentTop = 0;

    // Find start index
    if (typeof itemHeight === 'number') {
      start = Math.floor(scrollTop / itemHeight);
    } else {
      // Dynamic height - estimate based on stored heights
      for (let i = 0; i < items.length; i++) {
        const height = itemHeightsRef.current.get(i) || 50; // Default estimate
        if (currentTop + height > scrollTop) {
          start = i;
          break;
        }
        currentTop += height;
      }
    }

    // Calculate end index
    const visibleCount = typeof itemHeight === 'number'
      ? Math.ceil(containerHeight / itemHeight)
      : Math.ceil(containerHeight / 50); // Estimate for dynamic

    end = Math.min(start + visibleCount + overscan * 2, items.length);
    start = Math.max(0, start - overscan);

    return { start, end };
  }, [scrollTop, items.length, itemHeight, containerHeight, overscan]);

  // Calculate total height
  useEffect(() => {
    if (typeof itemHeight === 'number') {
      setTotalHeight(items.length * itemHeight);
    } else {
      // Dynamic height - sum all stored heights
      let total = 0;
      for (let i = 0; i < items.length; i++) {
        total += itemHeightsRef.current.get(i) || 50;
      }
      setTotalHeight(total);
    }
  }, [items.length, itemHeight]);

  // Handle scroll
  const handleScroll = (e) => {
    const newScrollTop = e.target.scrollTop;
    setScrollTop(newScrollTop);
    if (onScroll) {
      onScroll(newScrollTop);
    }
  };

  // Measure item height for dynamic sizing
  const measureItem = (index, element) => {
    if (element && itemHeight === 'auto') {
      const height = element.offsetHeight;
      const currentHeight = itemHeightsRef.current.get(index);
      if (currentHeight !== height) {
        itemHeightsRef.current.set(index, height);
        // Recalculate total height
        let total = 0;
        for (let i = 0; i < items.length; i++) {
          total += itemHeightsRef.current.get(i) || 50;
        }
        setTotalHeight(total);
      }
    }
  };

  // Calculate offset for visible items
  const getItemOffset = (index) => {
    if (typeof itemHeight === 'number') {
      return index * itemHeight;
    } else {
      let offset = 0;
      for (let i = 0; i < index; i++) {
        offset += itemHeightsRef.current.get(i) || 50;
      }
      return offset;
    }
  };

  const visibleItems = items.slice(visibleRange.start, visibleRange.end);
  const offsetY = getItemOffset(visibleRange.start);

  return (
    <div
      ref={setContainerRef}
      className={`relative overflow-auto scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-track]:rounded [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded hover:[&::-webkit-scrollbar-thumb]:bg-slate-500 dark:[&::-webkit-scrollbar-track]:bg-slate-800 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600 dark:hover:[&::-webkit-scrollbar-thumb]:bg-slate-500 ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div
        className="relative w-full"
        style={{
          height: totalHeight
        }}
      >
        <div
          className="w-full"
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map((item, index) => {
            const actualIndex = visibleRange.start + index;
            return (
              <div
                key={actualIndex}
                ref={(el) => measureItem(actualIndex, el)}
                className="w-full box-border"
                style={
                  typeof itemHeight === 'number'
                    ? { height: itemHeight }
                    : undefined
                }
              >
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VirtualList;

