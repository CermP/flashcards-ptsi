export class BlurText {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            animateBy: 'words', // 'words' or 'letters'
            direction: 'top',
            startOffset: 0.85,  // Default: start revealing when element is 85% from top
            scrollRange: 0.35,  // Takes 35% of viewport height to fully reveal
            ...options
        };

        // Fallback for previous configuration overrides
        // If the user passed rootMargin like '0px 0px -28% 0px', it parses to 72% start offset
        if (this.options.rootMargin && this.options.rootMargin.includes('-')) {
            const match = this.options.rootMargin.match(/-(\d+)%/);
            if (match) {
                this.options.startOffset = 1 - (parseInt(match[1], 10) / 100);
            }
        }

        this.ticking = false;
        this.init();
    }

    init() {
        if (!this.element) return;

        const text = this.element.textContent.trim();
        this.element.textContent = '';
        this.element.style.display = 'flex';
        this.element.style.flexWrap = 'wrap';

        const segments = this.options.animateBy === 'words' ? text.split(' ') : text.split('');

        this.spans = segments.map((segment, index) => {
            const span = document.createElement('span');
            span.textContent = segment === ' ' ? '\u00A0' : segment;
            if (this.options.animateBy === 'words' && index < segments.length - 1) {
                span.textContent += '\u00A0';
            }

            span.style.display = 'inline-block';
            span.style.willChange = 'transform, filter, opacity';

            // Set initial state
            this.applyState(span, 0);

            this.element.appendChild(span);
            return span;
        });

        this.onScroll = this.onScroll.bind(this);

        // Use IntersectionObserver only to add/remove the scroll listener efficiently
        this.observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    window.addEventListener('scroll', this.onScroll, { passive: true });
                    window.addEventListener('resize', this.onScroll, { passive: true });
                    this.onScroll(); // initial check
                } else {
                    window.removeEventListener('scroll', this.onScroll);
                    window.removeEventListener('resize', this.onScroll);
                }
            },
            {
                // Give a generous margin so we attach listeners before it comes into view
                rootMargin: '100% 0px 100% 0px'
            }
        );

        this.observer.observe(this.element);
    }

    onScroll() {
        if (!this.ticking) {
            window.requestAnimationFrame(() => {
                this.update();
                this.ticking = false;
            });
            this.ticking = true;
        }
    }

    update() {
        const rect = this.element.getBoundingClientRect();
        const windowHeight = window.innerHeight;

        const relY = rect.top / windowHeight;

        const start = this.options.startOffset;
        const end = start - this.options.scrollRange;

        let globalProgress = 0;
        if (relY <= end) {
            globalProgress = 1;
        } else if (relY >= start) {
            globalProgress = 0;
        } else {
            globalProgress = (start - relY) / (start - end);
        }

        const totalSpans = this.spans.length;
        // Each span takes up 40% of the total scroll phase to complete its animation
        const spanSlice = 0.4;

        this.spans.forEach((span, index) => {
            const spanStart = (index / Math.max(1, totalSpans - 1)) * (1 - spanSlice);
            const spanEnd = spanStart + spanSlice;

            let p = 0;
            if (globalProgress >= spanEnd) {
                p = 1;
            } else if (globalProgress <= spanStart) {
                p = 0;
            } else {
                p = (globalProgress - spanStart) / spanSlice;
            }

            // Ease-out effect for smoother text rendering
            p = 1 - Math.pow(1 - p, 4);
            this.applyState(span, p);
        });
    }

    applyState(span, progress) {
        const fromY = this.options.direction === 'top' ? -50 : 50;

        const opacity = progress;
        const blurAmount = 10 * (1 - progress);
        const y = fromY * (1 - progress);

        span.style.opacity = opacity;
        span.style.filter = `blur(${blurAmount}px)`;
        span.style.transform = `translateY(${y}px)`;
    }
}
