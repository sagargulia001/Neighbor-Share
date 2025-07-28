document.addEventListener('DOMContentLoaded', async () => {

    // --- CONSTANTS & GLOBAL STATE ---
    const DATA_VERSION = '1.5'; // Version for dark mode and mobile nav
    const scrollAnimationState = {};
    const restartTimers = {};


    // --- USER SIMULATION ---
    const getCurrentUser = () => localStorage.getItem('neighborShareUser');
    const setCurrentUser = (username) => localStorage.setItem('neighborShareUser', username);
    const logoutUser = () => localStorage.removeItem('neighborShareUser');

    // --- DATA HANDLING ---
    const getListings = () => JSON.parse(localStorage.getItem('neighborShareListings')) || [];
    const saveListings = (listings) => localStorage.setItem('neighborShareListings', JSON.stringify(listings));
    const getRequests = () => JSON.parse(localStorage.getItem('neighborShareRequests')) || [];
    const saveRequests = (requests) => localStorage.setItem('neighborShareRequests', JSON.stringify(requests));
    const getProfiles = () => JSON.parse(localStorage.getItem('neighborShareProfiles')) || {};
    const saveProfiles = (profiles) => localStorage.setItem('neighborShareProfiles', JSON.stringify(profiles));
    const getUserProfile = (username) => getProfiles()[username] || { name: username, email: '', contact: '', address: '', locality: '', pfpUrl: '' };
    const saveUserProfile = async (username, data, imageFile) => {
        const profiles = getProfiles();
        const existingProfile = profiles[username] || {};
        let pfpUrl = existingProfile.pfpUrl || '';
        if (imageFile && imageFile.size > 0) {
            try {
                pfpUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = () => reject(reader.error);
                    reader.readAsDataURL(imageFile);
                });
            } catch (error) {
                console.error("Error reading profile picture file:", error);
            }
        }
        profiles[username] = { ...data, pfpUrl };
        saveProfiles(profiles);
    };

    // --- DEMO DATA SEEDING ---
    const seedDemoData = async () => {
        const currentVersion = localStorage.getItem('neighborShareDataVersion');
        if (currentVersion === DATA_VERSION) return;
        try {
            const response = await fetch('data.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            const allItems = [...(data.listings || []), ...(data.donations || [])];
            saveListings(allItems);
            saveRequests(data.requests || []);
            localStorage.setItem('neighborShareDataVersion', DATA_VERSION);
        } catch (error) {
            console.error("Could not fetch or parse demo data:", error);
        }
    };

    // --- DYNAMIC RENDERING LOGIC ---
    const createPlaceholderUrl = (size, text) => `https://placehold.co/${size}/e2e8f0/333?text=${encodeURIComponent(text)}`;

    const createListingCard = (item, options = {}) => {
        const isForSale = item.type === 'sale';
        const isToLend = item.type === 'lend';
        const isDonation = item.type === 'donation';

        let tagText, tagColor, priceOrStatus, actionText, actionColor;

        if (isForSale) {
            tagText = 'FOR SALE';
            tagColor = 'bg-green-100 text-green-800';
            priceOrStatus = `<span class="text-lg font-bold text-gray-800">₹${item.price}</span>`;
            actionText = 'Details';
            actionColor = 'text-blue-600';
        } else if (isToLend) {
            tagText = 'TO LEND';
            tagColor = 'bg-blue-100 text-blue-800';
            if (item.price && parseFloat(item.price) > 0) {
                // Display rental price with unit below price
                priceOrStatus = `<div class="flex flex-col items-start"><span class="text-lg font-bold text-gray-800 whitespace-nowrap">₹${item.price}</span><span class="text-xs text-gray-500 whitespace-nowrap mt-1">${item.price_unit || ''}</span></div>`;
            } else {
                // Display free
                priceOrStatus = '<span class="text-md font-bold text-gray-800">Free to Borrow</span>';
            }
            actionText = 'Details';
            actionColor = 'text-blue-600';
        } else if (isDonation) {
            tagText = 'DONATION';
            tagColor = 'bg-purple-100 text-purple-800';
            priceOrStatus = '<span class="text-md font-bold text-purple-800">Free to Claim</span>';
            actionText = 'Claim';
            actionColor = 'text-purple-600';
        }

        const cardActions = options.isDashboard
            ? `<button data-id="${item.id}" data-type="listing" class="delete-btn text-red-600 font-semibold hover:underline">Delete</button>`
            : `<span class="${actionColor} font-semibold text-sm">${actionText}</span>`;

        const cardClassBase = options.isGrid
            ? 'bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col text-xs sm:text-sm p-2 sm:p-3 w-full max-w-xs sm:max-w-md'
            : 'carousel-item bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col text-xs sm:text-sm p-2 sm:p-3';

        const cardContent = `
            <div class="relative">
                <img draggable="false" src="${item.imageUrl || createPlaceholderUrl('400x300', item.name)}" alt="${item.name}" class="w-full h-32 sm:h-36 object-cover pointer-events-none rounded-t-lg">
                <span class="absolute top-2 right-2 text-xs font-semibold px-2 py-1 rounded-full ${tagColor}">${tagText}</span>
            </div>
            <div class="flex flex-col flex-1 p-3">
                <h3 class="font-semibold text-sm mb-1">${item.name}</h3>
                <p class="text-gray-600 text-xs flex-grow line-clamp-6 sm:line-clamp-4 mb-2">${item.description}</p>
                <div class="flex items-end justify-between mt-auto pt-2">
                    <span>${priceOrStatus}</span>
                    ${cardActions}
                </div>
            </div>
        `;

        if (options.isDashboard) {
            return `<div class="${cardClassBase}">${cardContent}</div>`;
        } else {
            const linkClass = cardClassBase + ' block hover:shadow-lg hover:-translate-y-1 transition-all duration-200';
            return `<a href="item-detail.html?id=${item.id}" class="${linkClass}">${cardContent}</a>`;
        }
    };

    const createRequestCard = (request, options = {}) => {
        const cardActions = options.isDashboard
            ? `<button data-id="${request.id}" data-type="request" class="delete-btn text-red-600 font-semibold hover:underline">Delete</button>`
            : `<span class="text-blue-600 font-semibold text-sm">I can help!</span>`;
        const cardClassBase = options.isGrid
            ? 'bg-yellow-50 border border-yellow-200 rounded-lg shadow-sm overflow-hidden flex flex-col text-xs sm:text-sm p-2 sm:p-3 w-full max-w-xs sm:max-w-md'
            : 'request-carousel-item bg-yellow-50 border border-yellow-200 rounded-lg shadow-sm overflow-hidden flex flex-col text-xs sm:text-sm p-2 sm:p-3';
        const cardContent = `<div class="p-2 sm:p-3 flex flex-col flex-grow"><div class="flex items-center justify-between mb-1 sm:mb-2"><span class="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-1 rounded-full">REQUEST</span><h3 class="font-semibold text-xs sm:text-md text-yellow-900">${request.name}</h3></div><p class="text-gray-600 text-xs flex-grow h-16">${request.description}</p><div class="mt-1 sm:mt-2 text-right">${cardActions}</div></div>`;

        if (options.isDashboard) {
            return `<div class="${cardClassBase}">${cardContent}</div>`;
        } else {
            const linkClass = cardClassBase + ' block hover:shadow-lg hover:-translate-y-1 transition-all duration-200';
            return `<a href="item-detail.html?id=${request.id}&type=request" class="${linkClass}">${cardContent}</a>`;
        }
    };

    const handleListingForm = (form) => {
        if (!form) return;
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const user = getCurrentUser();
            if (!user) { alert("Please log in to post an item."); return; }

            const formData = new FormData(form);
            const listings = getListings();
            const imageFile = formData.get('itemImage');
            let imageUrl = '';

            // Handle file upload by converting to a Data URL
            if (imageFile && imageFile.size > 0) {
                try {
                    imageUrl = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = () => reject(reader.error);
                        reader.readAsDataURL(imageFile);
                    });
                } catch (error) {
                    console.error("Error reading image file:", error);
                    alert("There was an error processing the image. Please try another one.");
                    return; // Stop submission on error
                }
            }

            const newListing = {
                id: Date.now(),
                owner: user,
                name: formData.get('itemName'),
                description: formData.get('itemDescription'),
                imageUrl: imageUrl,
                type: form.dataset.type,
                price: parseFloat(formData.get('itemPrice')) || 0,
                price_unit: form.dataset.type === 'lend' ? formData.get('itemPriceUnit') : null
            };

            saveListings([newListing, ...listings]);

            const successMessage = document.getElementById('form-success-message');

            // Hide form, show success message
            form.style.display = 'none';
            if (successMessage) {
                successMessage.classList.remove('hidden');
            }

            // Find and attach listener to the "Add another" button inside the success message
            const addAnotherBtn = successMessage?.querySelector('#add-another-btn');
            if (addAnotherBtn) {
                addAnotherBtn.addEventListener('click', () => {
                    form.reset();
                    document.getElementById('image-preview')?.classList.add('hidden');
                    successMessage.classList.add('hidden');
                    form.style.display = 'block';
                }, { once: true });
            }
        });
    };

    const renderHomepageContent = (searchTerm = '') => {
        const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
        const allListings = getListings();
        const allRequests = getRequests();

        const filteredListings = lowerCaseSearchTerm
            ? allListings.filter(item => item.name.toLowerCase().includes(lowerCaseSearchTerm) || item.description.toLowerCase().includes(lowerCaseSearchTerm))
            : allListings;

        const forSaleItems = filteredListings.filter(i => i.type === 'sale');
        const toLendItems = filteredListings.filter(i => i.type === 'lend');
        const forDonationItems = filteredListings.filter(i => i.type === 'donation');

        const emptySearchMessage = `<div class="text-center text-gray-500 p-4 sm:p-8 w-full flex items-center justify-center h-full min-h-[160px] sm:min-h-[240px]"><p class="text-xs sm:text-base">Can't find what you're looking for? <a href="request.html" class="text-blue-600 font-semibold hover:underline">Submit a request!</a></p></div>`;

        const renderCarouselSection = (containerId, items, cardCreator, emptyText, isSearchable = true) => {
            const container = document.getElementById(containerId);
            if (!container) return;

            if (items.length > 0) {
                container.innerHTML = items.map(cardCreator).join('');
                initCarousel(container);
            } else if (lowerCaseSearchTerm && isSearchable) {
                container.innerHTML = emptySearchMessage;
                container.dataset.initialized = 'false';
            } else {
                container.innerHTML = `<p class="text-center text-gray-500 p-4 sm:p-8 w-full min-h-[160px] sm:min-h-[240px] flex items-center justify-center text-xs sm:text-base">${emptyText}</p>`;
                container.dataset.initialized = 'false';
            }
        };

        renderCarouselSection('for-sale-container', forSaleItems, createListingCard, 'No items for sale right now.');
        renderCarouselSection('to-lend-container', toLendItems, createListingCard, 'No items to lend right now.');
        renderCarouselSection('donation-container', forDonationItems, createListingCard, 'No items for donation right now.');
        renderCarouselSection('request-container', allRequests, createRequestCard, 'No community requests right now.', false);
    };
    // --- Carousel Animation & Handling ---
    const stopAutoScroll = (carousel) => {
        if (scrollAnimationState[carousel.id]) {
            cancelAnimationFrame(scrollAnimationState[carousel.id]);
            delete scrollAnimationState[carousel.id];
        }
    };

    const startAutoScroll = (carousel, speed = 0.5) => {
        if (scrollAnimationState[carousel.id] || !carousel) return;

        const scrollContent = () => {
            if (!document.body.contains(carousel)) {
                stopAutoScroll(carousel);
                return;
            }
            carousel.scrollLeft += speed;
            // If we've scrolled past the original content, seamlessly loop back to the start
            if (carousel.scrollLeft >= carousel.scrollWidth / 2) {
                carousel.scrollLeft -= carousel.scrollWidth / 2;
            }
            scrollAnimationState[carousel.id] = requestAnimationFrame(scrollContent);
        };
        scrollAnimationState[carousel.id] = requestAnimationFrame(scrollContent);
    };

    const initCarousel = (carousel) => {
        if (!carousel || carousel.children.length === 0 || carousel.dataset.initialized === 'true') return;
        // Clone children for infinite scroll effect
        Array.from(carousel.children).forEach(item => carousel.appendChild(item.cloneNode(true)));
        carousel.dataset.initialized = 'true';

        // --- Enhanced Interaction Logic ---
        carousel.style.cursor = 'grab';
        carousel.style.scrollBehavior = 'auto'; // Disable smooth scrolling for immediate drag feedback
        Array.from(carousel.children).forEach(child => {
            child.style.userSelect = 'none';
            const link = child.tagName === 'A' ? child : child.querySelector('a');
            if (link) link.draggable = false;
        });

        let isDown = false;
        let startX, startY;
        let scrollLeft;
        let hasDragged = false;
        let isScrollingHorizontally;

        // For momentum scrolling
        let velocity = 0;
        let frame;
        let momentumID;

        const momentumLoop = () => {
            carousel.scrollLeft -= velocity;
            velocity *= 0.95; // Apply friction/damping

            // Handle infinite scroll wrapping during momentum
            if (carousel.scrollLeft >= carousel.scrollWidth / 2) {
                carousel.scrollLeft -= carousel.scrollWidth / 2;
            } else if (carousel.scrollLeft < 0) {
                carousel.scrollLeft += carousel.scrollWidth / 2;
            }

            if (Math.abs(velocity) > 0.5) {
                momentumID = requestAnimationFrame(momentumLoop);
            } else {
                // Momentum has ended, restart autoscroll after a delay
                restartTimers[carousel.id] = setTimeout(() => startAutoScroll(carousel), 2500);
            }
        };

        const startInteraction = (e) => {
            isDown = true;
            hasDragged = false;
            isScrollingHorizontally = undefined;
            carousel.style.cursor = 'grabbing';

            // Stop any existing momentum or autoscroll animations
            cancelAnimationFrame(momentumID);
            stopAutoScroll(carousel);
            clearTimeout(restartTimers[carousel.id]);

            startX = (e.pageX || e.touches[0].pageX) - carousel.offsetLeft;
            startY = (e.pageY || e.touches[0].pageY) - carousel.offsetTop;
            scrollLeft = carousel.scrollLeft;

            // Initialize for velocity tracking
            frame = startX;
            velocity = 0;
        };

        const endInteraction = () => {
            if (!isDown) return;
            isDown = false;
            carousel.style.cursor = 'grab';

            // If the user dragged and has some velocity, start the momentum animation
            if (hasDragged && Math.abs(velocity) > 1) {
                momentumID = requestAnimationFrame(momentumLoop);
            } else {
                // Otherwise, just restart autoscroll after a delay
                restartTimers[carousel.id] = setTimeout(() => startAutoScroll(carousel), 2500);
            }
        };

        const moveInteraction = (e) => {
            if (!isDown) return;

            // For touch events, intelligently decide if it's a horizontal swipe or vertical page scroll
            if (e.touches) {
                const currentX = e.touches[0].pageX - carousel.offsetLeft;
                const currentY = e.touches[0].pageY - carousel.offsetTop;
                const deltaX = Math.abs(currentX - startX);
                const deltaY = Math.abs(currentY - startY);

                if (isScrollingHorizontally === undefined) {
                    if (deltaX > 5 || deltaY > 5) {
                        isScrollingHorizontally = deltaX > deltaY;
                    }
                }
                if (isScrollingHorizontally === false) { return; }
            }
            
            e.preventDefault();
            const x = (e.pageX || e.touches[0].pageX) - carousel.offsetLeft;
            const walk = (x - startX);
            if (Math.abs(walk) > 10) {
                hasDragged = true;
            }
            carousel.scrollLeft = scrollLeft - walk;

            // Track velocity for momentum
            velocity = x - frame;
            frame = x;
        };

        // Prevent navigation on items if a drag occurred
        carousel.addEventListener('click', (e) => {
            if (hasDragged && e.target.closest('a')) { e.preventDefault(); e.stopPropagation(); }
        }, true);

        // Mouse & Touch Events for Drag/Swipe
        carousel.addEventListener('mousedown', startInteraction);
        carousel.addEventListener('mouseup', endInteraction);
        carousel.addEventListener('mousemove', moveInteraction);
        carousel.addEventListener('touchstart', startInteraction, { passive: true });
        carousel.addEventListener('touchend', endInteraction);
        carousel.addEventListener('touchmove', moveInteraction, { passive: false });

        // Autoscroll and Hover Logic
        startAutoScroll(carousel);
        carousel.addEventListener('mouseenter', () => { if (!isDown) stopAutoScroll(carousel); });
        carousel.addEventListener('mouseleave', () => {
            if (isDown) { endInteraction(); // End drag and trigger momentum if mouse leaves
        } else {
                // Normal hover-out, resume autoscroll
                clearTimeout(restartTimers[carousel.id]);
                restartTimers[carousel.id] = setTimeout(() => startAutoScroll(carousel), 500);
            }
        });
    };
    const renderBuyPage = (searchTerm = '') => {
        const grid = document.getElementById('buy-items-grid');
        if (!grid) return;
        const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
        let items = getListings().filter(i => i.type === 'sale');

        if (lowerCaseSearchTerm) {
            items = items.filter(item => item.name.toLowerCase().includes(lowerCaseSearchTerm) || item.description.toLowerCase().includes(lowerCaseSearchTerm));
        }

        if (items.length > 0) {
            grid.innerHTML = items.map(item => createListingCard(item, { isGrid: true })).join('');
        } else {
            grid.innerHTML = lowerCaseSearchTerm
                ? `<div class="col-span-full text-center text-gray-500 p-4 sm:p-8"><p class="text-xs sm:text-base">No items match your search. <a href="request.html" class="text-blue-600 font-semibold hover:underline">Want to request it?</a></p></div>`
                : `<p class="col-span-full text-gray-500 text-center py-2 sm:py-4 text-xs sm:text-base">No items for sale right now.</p>`;
        }
    };
    const renderBorrowPage = (searchTerm = '') => {
        const grid = document.getElementById('borrow-items-grid');
        if (!grid) return;
        const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
        let items = getListings().filter(i => i.type === 'lend');

        if (lowerCaseSearchTerm) {
            items = items.filter(item => item.name.toLowerCase().includes(lowerCaseSearchTerm) || item.description.toLowerCase().includes(lowerCaseSearchTerm));
        }

        if (items.length > 0) {
            grid.innerHTML = items.map(item => createListingCard(item, { isGrid: true })).join('');
        } else {
            grid.innerHTML = lowerCaseSearchTerm
                ? `<div class="col-span-full text-center text-gray-500 p-4 sm:p-8"><p class="text-xs sm:text-base">No items match your search. <a href="request.html" class="text-blue-600 font-semibold hover:underline">Want to request it?</a></p></div>`
                : `<p class="col-span-full text-gray-500 text-center py-2 sm:py-4 text-xs sm:text-base">No items to borrow right now.</p>`;
        }
    };
    const renderCharityPage = () => {
        const grid = document.getElementById('charity-items-grid');
        if (!grid) return;
        const itemsToDisplay = getListings().filter(i => i.type === 'donation').map(item => createListingCard(item, { isGrid: true }));
        grid.innerHTML = itemsToDisplay.length > 0 ? itemsToDisplay.join('') : `<p class="col-span-full text-gray-500 text-center py-2 sm:py-4 text-xs sm:text-base">No items for donation right now.</p>`;
    };
    const renderRequestBoardPage = () => {
        const grid = document.getElementById('request-board-grid');
        if (!grid) return;
        const itemsToDisplay = getRequests().map(req => createRequestCard(req, { isGrid: true }));
        grid.innerHTML = itemsToDisplay.length > 0 ? itemsToDisplay.join('') : `<p class="col-span-full text-gray-500 text-center py-2 sm:py-4 text-xs sm:text-base">There are no community requests at the moment.</p>`;
    };
    const renderDetailPage = () => {
        const params = new URLSearchParams(window.location.search);
        const itemId = parseInt(params.get('id'));
        const itemType = params.get('type'); // 'request' or null for listings

        const detailContainer = document.getElementById('item-detail-container');
        if (!detailContainer) return;

        if (!itemId) {
            detailContainer.innerHTML = '<p class="text-center text-red-500 font-semibold">Error: Item ID not provided.</p>';
            return;
        }

        let item;
        if (itemType === 'request') {
            item = getRequests().find(r => r.id === itemId);
            if (item) item.item_type = 'request'; // Add a temporary type for logic
        } else {
            item = getListings().find(l => l.id === itemId);
        }

        if (!item) {
            detailContainer.innerHTML = '<p class="text-center text-red-500 font-semibold">Error: Item not found.</p>';
            return;
        }

        let tagText, tagColor, priceOrStatus, actionText, actionColor, ownerText;

        if (item.type === 'sale') {
            tagText = 'FOR SALE'; tagColor = 'bg-green-100 text-green-800';
            priceOrStatus = `<span class="text-3xl font-bold text-gray-900">₹${item.price}</span>`;
            actionText = 'Contact Seller'; actionColor = 'bg-green-600 hover:bg-green-700';
        } else if (item.type === 'lend') {
            tagText = 'TO LEND'; tagColor = 'bg-blue-100 text-blue-800';
            priceOrStatus = (item.price && parseFloat(item.price) > 0)
                ? `<div class="flex items-baseline"><span class="text-3xl font-bold text-gray-900">₹${item.price}</span><span class="text-md text-gray-600 ml-2">${item.price_unit || ''}</span></div>`
                : '<span class="text-2xl font-bold text-gray-900">Free to Borrow</span>';
            actionText = 'Request to Borrow'; actionColor = 'bg-blue-600 hover:bg-blue-700';
        } else if (item.type === 'donation') {
            tagText = 'DONATION'; tagColor = 'bg-purple-100 text-purple-800';
            priceOrStatus = '<span class="text-2xl font-bold text-purple-800">Free to Claim</span>';
            actionText = 'Claim Item'; actionColor = 'bg-purple-600 hover:bg-purple-700';
        } else if (item.item_type === 'request') {
            tagText = 'REQUEST'; tagColor = 'bg-yellow-100 text-yellow-800';
            priceOrStatus = '<span class="text-2xl font-bold text-yellow-800">Community Request</span>';
            actionText = 'I Can Help!'; actionColor = 'bg-yellow-500 hover:bg-yellow-600';
        }

        ownerText = item.item_type === 'request' ? 'Requested by' : 'Listed by';

        const detailHTML = `
            <div class="grid md:grid-cols-2 gap-x-12 gap-y-8">
                <div><img src="${item.imageUrl || createPlaceholderUrl('600x500', item.name)}" alt="${item.name}" class="w-full rounded-lg shadow-lg object-cover h-64 sm:h-96"></div>
                <div class="flex flex-col">
                    <span class="text-sm font-semibold px-3 py-1 rounded-full ${tagColor} self-start">${tagText}</span>
                    <h1 class="text-4xl font-bold text-gray-900 mt-4">${item.name}</h1>
                    <p class="text-gray-500 mt-2">${ownerText}: <span class="font-medium text-gray-700">${item.owner}</span></p>
                    <hr class="my-6">
                    <div class="mb-6">${priceOrStatus}</div>
                    <p class="text-gray-700 leading-relaxed flex-grow">${item.description}</p>
                    <div class="mt-8"><button class="w-full ${actionColor} text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg">${actionText}</button></div>
                </div>
            </div>`;

        detailContainer.innerHTML = detailHTML;
    };
    const buildNav = () => {
        const navContainer = document.getElementById('main-nav');
        if (!navContainer) return;
        navContainer.innerHTML = `
            <div class="relative dropdown">
                <a href="#" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors duration-200 flex items-center" onclick="event.preventDefault();">Marketplace <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg></a>
                <div class="dropdown-menu absolute hidden bg-white shadow-lg rounded-md pt-4 pb-2 w-40">
                    <a href="buy.html" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Buy Items</a>
                    <a href="sell.html" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Sell an Item</a>
                </div>
            </div>
            <div class="relative dropdown">
                <a href="#" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors duration-200 flex items-center" onclick="event.preventDefault();">Sharing Pool <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg></a>
                <div class="dropdown-menu absolute hidden bg-white shadow-lg rounded-md pt-4 pb-2 w-40">
                    <a href="borrow.html" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Borrow Items</a>
                    <a href="lend.html" class="block px-4 py-2 text-gray-700 hover:bg-gray-100">Lend an Item</a>
                </div>
            </div>
            <a href="request.html" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors">Request Board</a>
            <a href="charity.html" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors">Charity</a>
        `;
    };
    const buildMobileNav = () => {
        const mobileMenuContainer = document.getElementById('mobile-menu');
        if (!mobileMenuContainer) return;

        const user = getCurrentUser();
        let navLinksHTML = `
            <a href="buy.html" class="block px-6 py-3 text-gray-700 hover:bg-gray-100">Buy</a>
            <a href="sell.html" class="block px-6 py-3 text-gray-700 hover:bg-gray-100">Sell</a>
            <a href="borrow.html" class="block px-6 py-3 text-gray-700 hover:bg-gray-100">Borrow</a>
            <a href="lend.html" class="block px-6 py-3 text-gray-700 hover:bg-gray-100">Lend</a>
            <a href="request.html" class="block px-6 py-3 text-gray-700 hover:bg-gray-100">Request Board</a>
            <a href="charity.html" class="block px-6 py-3 text-gray-700 hover:bg-gray-100">Charity</a>
            <hr class="my-2">
        `;

        if (user) {
            navLinksHTML += `
                <a href="dashboard.html" class="block px-6 py-3 text-gray-700 hover:bg-gray-100">My Dashboard</a>
                <a href="profile.html" class="block px-6 py-3 text-gray-700 hover:bg-gray-100">My Profile</a>
                <a href="post-item.html" class="block px-6 py-3 text-blue-600 font-semibold hover:bg-gray-100">Post an Item</a>
                <a href="donate.html" class="block px-6 py-3 text-purple-600 font-semibold hover:bg-gray-100">Donate an Item</a>
                <button id="mobile-logout-btn" class="block w-full text-left px-6 py-3 text-red-600 font-semibold hover:bg-gray-100">Logout</button>
            `;
        } else {
            navLinksHTML += `<button id="mobile-login-btn" class="block w-full text-left px-6 py-3 text-blue-600 font-semibold hover:bg-gray-100">Login</button>`;
        }

        mobileMenuContainer.innerHTML = `<div class="pt-2 pb-4">${navLinksHTML}</div>`;

        document.getElementById('mobile-logout-btn')?.addEventListener('click', () => { logoutUser(); window.location.reload(); });
        document.getElementById('mobile-login-btn')?.addEventListener('click', () => {
            document.getElementById('login-modal').classList.remove('hidden');
            document.getElementById('login-modal').classList.add('flex');
            document.getElementById('mobile-menu').classList.add('hidden');
        });
    };
    const updateUserNav = () => {
        const navAuthSection = document.getElementById('nav-auth-section');
        if (!navAuthSection) return;
        const user = getCurrentUser();
        if (user) {
            const profile = getUserProfile(user);
            const profileIcon = profile.pfpUrl
                ? `<img src="${profile.pfpUrl}" alt="Profile" class="h-6 w-6 rounded-full object-cover">`
                : `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clip-rule="evenodd" /></svg>`;

            navAuthSection.innerHTML = `
                <a href="dashboard.html" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors">My Dashboard</a>
                <a href="post-item.html" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">Post Item</a>
                <a href="donate.html" class="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors">Donate</a>
                <div class="relative dropdown">
                    <button class="px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors flex items-center">
                        ${profileIcon}
                    </button>
                    <div class="dropdown-menu absolute hidden bg-white shadow-lg rounded-md pt-2 w-48 right-0 z-20">
                        <div class="px-4 py-3 border-b">
                            <p class="text-sm">Signed in as</p>
                            <p class="text-sm font-medium text-gray-900 truncate">${user}</p>
                        </div>
                        <div class="py-1"><a href="profile.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">My Profile</a></div>
                        <div class="py-1"><button id="logout-btn" class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Logout</button></div>
                    </div>
                </div>
            `;
            document.getElementById('logout-btn').addEventListener('click', () => { logoutUser(); window.location.reload(); });
        } else {
            navAuthSection.innerHTML = `<button id="login-btn" class="bg-blue-600 text-white font-semibold px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors">Login</button>`;
        }
    };
    const renderDashboard = () => {
        const user = getCurrentUser();
        if (!user) { window.location.href = 'index.html'; return; }
        document.getElementById('dashboard-title').textContent = `${user}'s Dashboard`;
        const allListings = getListings();
        const userSaleItems = allListings.filter(i => i.owner === user && i.type === 'sale');
        const userLendItems = allListings.filter(i => i.owner === user && i.type === 'lend');
        const userDonationItems = allListings.filter(i => i.owner === user && i.type === 'donation');
        const userRequests = getRequests().filter(r => r.owner === user);
        document.getElementById('user-sale-items').innerHTML = userSaleItems.map(item => createListingCard(item, { isDashboard: true, isGrid: true })).join('') || '<p>You have no items for sale.</p>';
        document.getElementById('user-lend-items').innerHTML = userLendItems.map(item => createListingCard(item, { isDashboard: true, isGrid: true })).join('') || '<p>You have no items to lend.</p>';
        document.getElementById('user-donation-items').innerHTML = userDonationItems.map(item => createListingCard(item, { isDashboard: true, isGrid: true })).join('') || '<p>You have no items for donation.</p>';
        document.getElementById('user-requests').innerHTML = userRequests.map(req => createRequestCard(req, { isDashboard: true, isGrid: true })).join('') || '<p>You have no active requests.</p>';
    };
    const handleRequestForm = (form) => {
        if (!form) return;
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const user = getCurrentUser();
            if (!user) {
                alert("Please log in to submit a request.");
                document.getElementById('login-modal').classList.remove('hidden');
                document.getElementById('login-modal').classList.add('flex');
                return;
            }
            const newRequest = { id: Date.now(), owner: user, name: form.elements.requestName.value, description: form.elements.requestDescription.value };
            saveRequests([newRequest, ...getRequests()]);
            form.reset();
            const successMessage = document.getElementById('success-message');
            successMessage.classList.remove('hidden');
            setTimeout(() => {
                successMessage.classList.add('hidden');
                renderRequestBoardPage();
            }, 3000);
        });
    };
    const renderProfilePage = () => {
        const user = getCurrentUser();
        if (!user) { window.location.href = 'index.html'; return; }

        const contentEl = document.getElementById('profile-content');
        const actionBtn = document.getElementById('profile-action-btn');
        let isEditMode = false;

        const renderView = () => {
            const profile = getUserProfile(user);
            document.getElementById('profile-picture-display').src = profile.pfpUrl || 'assets/pfp_placeholder.png';
            document.getElementById('profile-name-display').textContent = profile.name;

            contentEl.innerHTML = `
                <div><label class="block text-sm font-medium text-gray-500">Name</label><p class="mt-1 text-lg text-gray-900">${profile.name}</p></div>
                <div><label class="block text-sm font-medium text-gray-500">Email Address</label><p class="mt-1 text-lg text-gray-900">${profile.email || '<span class="text-gray-400">Not set</span>'}</p></div>
                <div><label class="block text-sm font-medium text-gray-500">Contact Number</label><p class="mt-1 text-lg text-gray-900">${profile.contact || '<span class="text-gray-400">Not set</span>'}</p></div>
                <div><label class="block text-sm font-medium text-gray-500">Address</label><p class="mt-1 text-lg text-gray-900">${profile.address || '<span class="text-gray-400">Not set</span>'}</p></div>
                <div><label class="block text-sm font-medium text-gray-500">Locality / Neighborhood</label><p class="mt-1 text-lg text-gray-900">${profile.locality || '<span class="text-gray-400">Not set</span>'}</p></div>
            `;
            actionBtn.textContent = 'Edit Profile';
            actionBtn.className = 'bg-blue-600 text-white font-semibold px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors';
            isEditMode = false;
        };

        const renderEdit = () => {
            const profile = getUserProfile(user);
            contentEl.innerHTML = `
                <form id="edit-profile-form" class="space-y-4">
                    <div>
                        <label for="edit-pfp" class="block text-sm font-medium text-gray-700">Profile Picture</label>
                        <div class="mt-1 flex items-center space-x-4">
                            <img id="pfp-preview" src="${profile.pfpUrl || 'assets/pfp_placeholder.png'}" alt="Profile Picture Preview" class="w-16 h-16 rounded-full object-cover">
                            <input type="file" id="edit-pfp" name="pfp" class="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" accept="image/png, image/jpeg, image/jpg">
                        </div>
                    </div>
                    <div><label for="edit-email" class="block text-sm font-medium text-gray-700">Email Address</label><input type="email" id="edit-email" name="email" value="${profile.email}" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"></div>
                    <div><label for="edit-contact" class="block text-sm font-medium text-gray-700">Contact Number</label><input type="tel" id="edit-contact" name="contact" value="${profile.contact}" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"></div>
                    <div><label for="edit-address" class="block text-sm font-medium text-gray-700">Address</label><textarea id="edit-address" name="address" rows="3" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">${profile.address}</textarea></div>
                    <div><label for="edit-locality" class="block text-sm font-medium text-gray-700">Locality / Neighborhood</label><input type="text" id="edit-locality" name="locality" value="${profile.locality}" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"></div>
                </form>
            `;
            actionBtn.textContent = 'Save Changes';
            actionBtn.className = 'bg-green-600 text-white font-semibold px-6 py-2 rounded-lg hover:bg-green-700 transition-colors';
            isEditMode = true;

            const pfpInput = document.getElementById('edit-pfp');
            const pfpPreview = document.getElementById('pfp-preview');
            pfpInput.addEventListener('change', () => {
                const file = pfpInput.files[0];
                if (file) pfpPreview.src = URL.createObjectURL(file);
            });
        };

        actionBtn.addEventListener('click', async () => {
            if (isEditMode) {
                const form = document.getElementById('edit-profile-form');
                const formData = new FormData(form);
                const pfpFile = form.elements.pfp.files[0];
                const profileData = { name: user, email: formData.get('email'), contact: formData.get('contact'), address: formData.get('address'), locality: formData.get('locality') };
                await saveUserProfile(user, profileData, pfpFile);
                renderView();
                updateUserNav(); // Refresh nav to show new PFP
            } else {
                renderEdit();
            }
        });

        renderView(); // Initial render
    };

    const loadHeader = async () => {
        const placeholder = document.getElementById('header-placeholder');
        if (!placeholder) return;
        try {
            const response = await fetch('_header.html');
            if (!response.ok) throw new Error(`Failed to fetch header: ${response.statusText}`);
            const headerHTML = await response.text();
            // Replace the placeholder div with the actual header content
            placeholder.outerHTML = headerHTML;
        } catch (error) {
            console.error("Error loading header:", error);
            placeholder.innerHTML = '<p class="text-center text-red-500 p-4">Error: Could not load page header.</p>';
        }
    };

    // --- INITIALIZATION ---
    await loadHeader(); // Load the header first
    await seedDemoData();
    buildNav(); // Now these functions can find the nav elements
    updateUserNav();
    buildMobileNav();

    const pageId = document.body.id;
    switch (pageId) {
        case 'page-index':
            renderHomepageContent();
            document.getElementById('search-input')?.addEventListener('input', (e) => {
                renderHomepageContent(e.target.value);
            });
            document.querySelectorAll('.scroll-btn').forEach(button => {
                button.addEventListener('click', () => {
                    const carousel = document.getElementById(button.dataset.carousel);
                    if (!carousel) return;
                    const firstItem = carousel.querySelector('.carousel-item, .request-carousel-item');
                    if (!firstItem) return;

                    stopAutoScroll(carousel); clearTimeout(restartTimers[carousel.id]);

                    const itemStyle = window.getComputedStyle(firstItem);
                    const itemWidth = firstItem.offsetWidth;
                    const itemMargin = parseFloat(itemStyle.marginRight);
                    const scrollAmount = (itemWidth + itemMargin) * 2; // Scroll by 2 card widths
                    carousel.scrollBy({ left: button.classList.contains('right') ? scrollAmount : -scrollAmount, behavior: 'smooth' });
                    restartTimers[carousel.id] = setTimeout(() => startAutoScroll(carousel), 5000);
                });
            });
            break;
        case 'page-buy':
            renderBuyPage();
            document.getElementById('search-input')?.addEventListener('input', (e) => {
                renderBuyPage(e.target.value);
            });
            break;
        case 'page-borrow':
            renderBorrowPage();
            document.getElementById('search-input')?.addEventListener('input', (e) => {
                renderBorrowPage(e.target.value);
            });
            break;
        case 'page-charity': renderCharityPage(); break;
        case 'page-item-detail': renderDetailPage(); break;
        case 'page-dashboard':
            renderDashboard();

            const confirmationModal = document.getElementById('confirmation-modal');
            const modalConfirmBtn = document.getElementById('modal-confirm-btn');
            const modalCancelBtn = document.getElementById('modal-cancel-btn');

            const showConfirmationModal = (id, type) => {
                if (!confirmationModal || !modalConfirmBtn) return;
                modalConfirmBtn.dataset.id = id;
                modalConfirmBtn.dataset.type = type;
                confirmationModal.classList.remove('hidden');
                confirmationModal.classList.add('flex');
            };

            const hideConfirmationModal = () => {
                if (!confirmationModal) return;
                confirmationModal.classList.add('hidden');
                confirmationModal.classList.remove('flex');
            };

            document.querySelector('main').addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-btn')) {
                    const button = e.target;
                    const id = parseInt(button.dataset.id);
                    const type = button.dataset.type;
                    showConfirmationModal(id, type);
                }
            });

            modalConfirmBtn?.addEventListener('click', () => {
                const id = parseInt(modalConfirmBtn.dataset.id);
                const type = modalConfirmBtn.dataset.type;
                if (type === 'listing') saveListings(getListings().filter(item => item.id !== id));
                else if (type === 'request') saveRequests(getRequests().filter(item => item.id !== id));
                hideConfirmationModal();
                renderDashboard();
            });

            modalCancelBtn?.addEventListener('click', hideConfirmationModal);
            break;
        case 'page-profile': renderProfilePage(); break;
        case 'page-request':
            renderRequestBoardPage();
            handleRequestForm(document.getElementById('request-form'));
            break;
        case 'page-sell':
        case 'page-lend':
        case 'page-donate':
            handleListingForm(document.querySelector('form'));
            const imageInput = document.getElementById('item-image');
            const imagePreview = document.getElementById('image-preview');
            if (imageInput && imagePreview) {
                imageInput.addEventListener('change', () => {
                    const file = imageInput.files[0];
                    if (file) {
                        imagePreview.src = URL.createObjectURL(file);
                        imagePreview.classList.remove('hidden');
                    } else {
                        imagePreview.classList.add('hidden');
                    }
                });
            }
            break;
    }

    document.getElementById('login-btn')?.addEventListener('click', () => {
        document.getElementById('login-modal').classList.remove('hidden');
        document.getElementById('login-modal').classList.add('flex');
    });
    document.getElementById('modal-close-btn')?.addEventListener('click', () => {
        document.getElementById('login-modal').classList.add('hidden');
        document.getElementById('login-modal').classList.remove('flex');
    });
    document.getElementById('modal-user-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('modal-username-input').value;
        if (username) {
            setCurrentUser(username);
            window.location.reload();
        }
    });

    // Mobile Menu Toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }
});
