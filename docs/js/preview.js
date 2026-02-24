/**
 * preview.js
 * Handles deck preview modal and link copying logic.
 */

document.addEventListener('DOMContentLoaded', () => {
    // ---- COPY LINK LOGIC ----
    const copyBtns = document.querySelectorAll('.copy-link-btn');
    const toast = document.getElementById('toast-notification');

    function showToast() {
        if (!toast) return;
        toast.classList.remove('hidden');
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.classList.add('hidden'), 300); // Wait for transition
        }, 2000);
    }

    copyBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const deckId = btn.getAttribute('data-deck-id');
            const url = new URL(window.location.href);
            url.hash = deckId;

            navigator.clipboard.writeText(url.toString()).then(() => {
                showToast();
            }).catch(err => {
                console.error("Failed to copy URL: ", err);
            });
        });
    });

    // ---- PREVIEW LOGIC ----
    const previewBtns = document.querySelectorAll('.preview-btn');
    const modal = document.getElementById('preview-modal');
    const closeBtn = document.getElementById('close-modal');

    const flashcard = document.getElementById('flashcard');
    const flashcardFront = document.getElementById('flashcard-front');
    const flashcardBack = document.getElementById('flashcard-back');
    const flipBtn = document.getElementById('flip-card');

    const prevBtn = document.getElementById('prev-card');
    const nextBtn = document.getElementById('next-card');

    const titleEl = document.getElementById('modal-deck-title');
    const currentIdxEl = document.getElementById('current-card-idx');
    const totalCardsEl = document.getElementById('total-cards-count');

    let currentCards = [];
    let currentIndex = 0;
    let isFlipped = false;

    function openModal() {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    function closeModal() {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
        currentCards = [];
        resetCard();
    }

    function resetCard() {
        isFlipped = false;
        flashcard.classList.remove('flipped');
        // Small delay to allow flip animation to start before content changes
        setTimeout(() => {
            flashcardFront.scrollTop = 0;
            flashcardBack.scrollTop = 0;
        }, 150);
    }

    function updateCardDisplay() {
        if (currentCards.length === 0) return;

        const card = currentCards[currentIndex];
        flashcardFront.innerHTML = card.front;
        flashcardBack.innerHTML = card.back;

        if (window.MathJax) {
            MathJax.typesetPromise([flashcardFront, flashcardBack]).catch((err) => console.log('MathJax error: ', err));
        }

        currentIdxEl.textContent = currentIndex + 1;
        totalCardsEl.textContent = currentCards.length;

        prevBtn.disabled = currentIndex === 0;
        nextBtn.disabled = currentIndex === currentCards.length - 1;
    }

    previewBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const previewUrl = btn.getAttribute('data-preview-url');
            const deckTitle = btn.getAttribute('data-deck-title');

            titleEl.textContent = "Chargement...";
            flashcardFront.innerHTML = "<div class='loading'>Chargement des cartes...</div>";
            flashcardBack.innerHTML = "";
            currentIdxEl.textContent = "--";
            totalCardsEl.textContent = "--";
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            resetCard();

            openModal();

            try {
                const response = await fetch(`${previewUrl}?t=${new Date().getTime()}`);
                if (!response.ok) throw new Error("Preview not found");

                const cards = await response.json();

                if (cards && cards.length > 0) {
                    currentCards = cards;
                    currentIndex = 0;
                    titleEl.textContent = deckTitle;
                    updateCardDisplay();
                } else {
                    titleEl.textContent = "Deck invalide";
                    flashcardFront.innerHTML = "Aucune carte trouvée pour ce deck.";
                }
            } catch (err) {
                console.error(err);
                titleEl.textContent = "Erreur";
                flashcardFront.innerHTML = "Impossible de charger l'aperçu du deck.<br>Ce deck n'a peut-être pas encore été régénéré.";
            }
        });
    });

    closeBtn.addEventListener('click', closeModal);

    let dragPreventClick = false; // Flag to prevent modal close after drag

    modal.addEventListener('click', (e) => {
        if (dragPreventClick) return;
        if (e.target === modal) closeModal(); // direct click on overlay
    });

    document.addEventListener('keydown', (e) => {
        if (modal.classList.contains('hidden')) return;

        if (e.key === 'Escape') closeModal();
        else if (e.key === 'ArrowRight') {
            goToNextCard();
        }
        else if (e.key === 'ArrowLeft') {
            goToPrevCard();
        }
        else if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            toggleFlip();
        }
    });

    function toggleFlip(withEffect = false) {
        isFlipped = !isFlipped;

        if (withEffect) {
            // Add a small pop effect when flipping via click
            flashcard.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            const popScale = `scale(1.01)`; // Reduced from 1.05 to make it very subtle
            const baseRotation = isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
            flashcard.style.transform = `${popScale} ${baseRotation}`;

            setTimeout(() => {
                flashcard.style.transform = baseRotation;
                setTimeout(() => {
                    flashcard.style.transition = '';
                    flashcard.classList.toggle('flipped', isFlipped);
                }, 300);
            }, 100); // Also reduced timeout slightly for a snappier feel
        } else {
            flashcard.classList.toggle('flipped', isFlipped);
        }
    }

    function goToNextCard(instant = false) {
        if (!nextBtn.disabled) {
            currentIndex++;
            resetCard();
            if (instant) updateCardDisplay();
            else setTimeout(updateCardDisplay, 150);
        }
    }

    function goToPrevCard(instant = false) {
        if (!prevBtn.disabled) {
            currentIndex--;
            resetCard();
            if (instant) updateCardDisplay();
            else setTimeout(updateCardDisplay, 150);
        }
    }

    flipBtn.addEventListener('click', toggleFlip);
    // Removed flashcard click event to flip, to make swiping easier
    // flashcard.addEventListener('click', toggleFlip);

    nextBtn.addEventListener('click', goToNextCard);
    prevBtn.addEventListener('click', goToPrevCard);

    // --- DRAG / SWIPE LOGIC (Mouse & Touch) ---
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;
    let startTime = 0;
    const SWIPE_DISTANCE_THRESHOLD = 100; // Lowered from 150
    const SWIPE_VELOCITY_THRESHOLD = 0.5; // pixels per ms

    function handleDragStart(e) {
        if (e.target.closest('button')) return; // ignore buttons
        isDragging = true;
        startX = e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
        startY = e.type.includes('mouse') ? e.pageY : e.touches[0].clientY;
        startTime = Date.now();
        flashcard.style.transition = 'transform 0.1s ease-out'; // quick transition for the press-down scale

        // Add a slight press-down effect
        const baseRotation = isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
        flashcard.style.transform = `scale(0.98) ${baseRotation}`;

        setTimeout(() => {
            if (isDragging) flashcard.style.transition = 'none'; // remove transition during actual drag movement
        }, 100);
    }

    function handleDragMove(e) {
        if (!isDragging) return;
        const x = e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
        const y = e.type.includes('mouse') ? e.pageY : e.touches[0].clientY;
        const diffX = x - startX;
        const diffY = y - startY;

        // Prevent vertical scrolling while swiping horizontally on touch devices
        // Only if horizontal movement is greater than vertical
        if (e.type.includes('touch') && Math.abs(diffX) > Math.abs(diffY)) {
            e.preventDefault();
        }

        currentX = diffX;
        currentY = diffY * 0.5; // Diminish vertical movement distance for feel

        let rotation = currentX * 0.02; // Reduced rotation: 0.02 deg per px
        if (isFlipped) rotation = -rotation; // Invert rotation for the back of the card

        const baseRotation = isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
        flashcard.style.transform = `translate(${currentX}px, ${currentY}px) ${baseRotation} rotateZ(${rotation}deg)`;
    }

    function handleDragEnd() {
        if (!isDragging) return;
        isDragging = false;

        const elapsedTime = Date.now() - startTime;
        const velocityX = Math.abs(currentX) / elapsedTime; // px per ms

        // Calculate if threshold is met natively by distance OR by velocity
        const isSwipedRight = (currentX > SWIPE_DISTANCE_THRESHOLD) || (currentX > 30 && velocityX > SWIPE_VELOCITY_THRESHOLD);
        const isSwipedLeft = (currentX < -SWIPE_DISTANCE_THRESHOLD) || (currentX < -30 && velocityX > SWIPE_VELOCITY_THRESHOLD);

        const isTap = Math.abs(currentX) < 10 && Math.abs(currentY) < 10 && elapsedTime < 400;

        if (Math.abs(currentX) > 5) {
            dragPreventClick = true;
            setTimeout(() => dragPreventClick = false, 50);
        }

        if (isTap) {
            // It was a click/tap, not a drag. Flip the card.
            flashcard.style.transform = '';
            flashcard.style.transition = '';
            toggleFlip(true);
            currentX = 0;
            currentY = 0;
            return;
        }

        // Restore transition for spring-back or exit animation
        flashcard.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

        if (isSwipedRight && !prevBtn.disabled) {
            // Swiped right -> Previous card
            const baseRotation = isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
            const exitRotation = isFlipped ? -10 : 10;
            const exitY = currentY * 2; // Let diagonal movement continue out of screen
            flashcard.style.transform = `translate(150vw, ${exitY}px) ${baseRotation} rotateZ(${exitRotation}deg)`;
            setTimeout(() => {
                flashcard.style.transition = 'none';
                goToPrevCard(true); // instant update

                // Elegant entrance
                flashcard.style.transform = `scale(0.85)`;
                flashcard.style.opacity = '0';
                void flashcard.offsetWidth; // force reflow

                flashcard.style.transition = 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.2s ease-out';
                flashcard.style.transform = `scale(1)`;
                flashcard.style.opacity = '1';

                setTimeout(() => {
                    flashcard.style.transition = '';
                    flashcard.style.transform = '';
                    flashcard.style.opacity = '';
                }, 300);
            }, 300);
        } else if (isSwipedLeft && !nextBtn.disabled) {
            // Swiped left -> Next card
            const baseRotation = isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
            const exitRotation = isFlipped ? 10 : -10;
            const exitY = currentY * 2;
            flashcard.style.transform = `translate(-150vw, ${exitY}px) ${baseRotation} rotateZ(${exitRotation}deg)`;
            setTimeout(() => {
                flashcard.style.transition = 'none';
                goToNextCard(true); // instant update

                // Elegant entrance
                flashcard.style.transform = `scale(0.85)`;
                flashcard.style.opacity = '0';
                void flashcard.offsetWidth; // force reflow

                flashcard.style.transition = 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.2s ease-out';
                flashcard.style.transform = `scale(1)`;
                flashcard.style.opacity = '1';

                setTimeout(() => {
                    flashcard.style.transition = '';
                    flashcard.style.transform = '';
                    flashcard.style.opacity = '';
                }, 300);
            }, 300);
        } else {
            // Snap back
            resetCardPosition();
            setTimeout(() => {
                if (!isDragging) flashcard.style.transition = ''; // clear inline transition after snap
            }, 500);
        }
        currentX = 0;
        currentY = 0;
    }

    function resetCardPosition() {
        flashcard.style.transform = '';
    }

    // Mouse Events
    flashcard.addEventListener('mousedown', handleDragStart);
    window.addEventListener('mousemove', handleDragMove, { passive: false });
    window.addEventListener('mouseup', handleDragEnd);

    // Touch Events
    flashcard.addEventListener('touchstart', handleDragStart, { passive: true });
    window.addEventListener('touchmove', handleDragMove, { passive: false });
    window.addEventListener('touchend', handleDragEnd);
    window.addEventListener('touchcancel', handleDragEnd);

    // Trackpad swipe logic
    let wheelTimeout;
    flashcard.addEventListener('wheel', (e) => {
        // Only react to horizontal scrolling mostly
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 20) {
            if (wheelTimeout) return; // Prevent multiple triggers for one swipe

            if (e.deltaX > 0) goToNextCard();
            else goToPrevCard();

            // Debounce trackpad events
            wheelTimeout = setTimeout(() => { wheelTimeout = null; }, 600);
        }
    }, { passive: true });
});
