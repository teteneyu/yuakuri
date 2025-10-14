'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // 状態管理オブジェクト
    const state = {
        cardName: '',
        cardNameSize: 64,
        atk: 2,
        hp: 2,
        leaderHp: 20, // 固定値
        showAtk: true,
        showHp: true,
        showLeaderHp: false,
        cardType: null,
        uploadedImage: null,
        imageScale: 1,
        imagePosX: 0,
        imagePosY: 0,
        allEffects: [],
        activeEffects: new Map(),
        activeTemplateMap: new Map(),
        effectCost: 0,
        totalCost: 0,
    };

    // DOM要素のキャッシュ
    const elements = {
        cardNameInput: document.getElementById('card-name-input'),
        cardNameSizeGroup: document.getElementById('card-name-size-group'),
        imageUpload: document.getElementById('image-upload'),
        imageZoom: document.getElementById('image-zoom'),
        imagePosX: document.getElementById('image-pos-x'),
        imagePosY: document.getElementById('image-pos-y'),
        imageCenterButton: document.getElementById('image-center-button'),
        cardTypeButtonsContainer: document.getElementById('card-type-buttons'),
        atk: {
            decrement: document.getElementById('atk-decrement'),
            increment: document.getElementById('atk-increment'),
            value: document.getElementById('atk-value'),
        },
        hp: {
            decrement: document.getElementById('hp-decrement'),
            increment: document.getElementById('hp-increment'),
            value: document.getElementById('hp-value'),
        },
        leaderHp: {
            value: document.getElementById('leader-hp-value'),
        },
        canvas: document.getElementById('canvas'),
        previewSizeGroup: document.getElementById('preview-size-group'),
        saveButton: document.getElementById('save-button'),
        totalCost: document.getElementById('total-cost'),
        effectCostTotal: document.getElementById('effect-cost-total'),
        effectsMenu: document.getElementById('effects-menu'),
        effectSearchInput: document.getElementById('effect-search-input'),
        resetEffectsButton: document.getElementById('reset-effects-button'),
        expandCollapseEffectsButton: document.getElementById('expand-collapse-effects-button'),
    };

    const ctx = elements.canvas.getContext('2d');

    const cardTypeData = {
        "ユニット": { cost: 0, color: "#ff5555" },
        "スキル":   { cost: -1, color: "#5555ff" },
        "トラップ": { cost: 0, color: "#800080" },
        "建物":     { cost: 1, color: "#32cd32" },
        "武器":     { cost: 0, color: "#ff9900" },
        "防具":     { cost: 1, color: "#00ced1" },
        "リーダー": { cost: 0, color: "#333333" },
    };

    const categoryRestrictions = {
        "【01】召喚条件系": ["ユニット", "建物", "武器", "防具"],
        "【02】使用条件系": ["スキル", "リーダー", "トラップ"],
        "【03】基礎効果系A": ["ユニット", "武器", "防具"],
        "【04】基礎効果系B": ["ユニット", "スキル", "トラップ", "建物", "武器", "防具"],
        "【05】発動条件系": ["ユニット", "武器", "防具"],
        "【13】トラップ専用": ["トラップ"],
    };

    // --- 描画関数 ---
    const render = () => {
        const borderWidth = 10;
        const bottomBarHeight = 70;
        ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);

        // 1. 画像を描画
        if (state.uploadedImage && state.uploadedImage.complete) {
            ctx.save();
            ctx.rect(borderWidth, borderWidth, elements.canvas.width - borderWidth * 2, elements.canvas.height - borderWidth - bottomBarHeight);
            ctx.clip();
            const w = state.uploadedImage.width * state.imageScale;
            const h = state.uploadedImage.height * state.imageScale;
            const x = state.imagePosX + (elements.canvas.width / 2) - (w / 2);
            const y = state.imagePosY + (elements.canvas.height / 2) - (h / 2);
            ctx.drawImage(state.uploadedImage, x, y, w, h);
            ctx.restore();
        }

        // 2. 縁を描画
        if (state.cardType && cardTypeData[state.cardType]) {
            ctx.fillStyle = cardTypeData[state.cardType].color;
            ctx.fillRect(0, 0, elements.canvas.width, borderWidth); // Top
            ctx.fillRect(0, 0, borderWidth, elements.canvas.height); // Left
            ctx.fillRect(elements.canvas.width - borderWidth, 0, borderWidth, elements.canvas.height); // Right
        }

        // 3. テキスト要素の描画
        const setTextStyleWithShadow = () => {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 6;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            ctx.strokeStyle = 'black';
            ctx.fillStyle = 'white';
        };

        setTextStyleWithShadow();
        ctx.font = `900 ${state.cardNameSize}px "Noto Sans JP", serif`;
        ctx.lineWidth = Math.max(2, state.cardNameSize / 8);
        ctx.textBaseline = 'middle';
        const cardNameX = 25;
        ctx.strokeText(state.cardName, cardNameX, 40);
        ctx.fillText(state.cardName, cardNameX, 40);
        ctx.textBaseline = 'alphabetic';

        drawCostStars(setTextStyleWithShadow);
        drawEffects();
        drawBottomBar();

        ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    };

    const drawCostStars = (applyStyle) => {
        applyStyle();
        ctx.font = '400 38px "Noto Sans JP", serif';
        ctx.lineWidth = 6;
        const starsCount = Math.max(0, state.totalCost);
        for (let i = 0; i < starsCount; i++) {
            if (i < 4) ctx.fillStyle = 'yellow';
            else if (i < 8) ctx.fillStyle = 'orange';
            else ctx.fillStyle = 'red';
            ctx.strokeText('★', 27 + i * 50, 120);
            ctx.fillText('★', 27 + i * 50, 120);
        }
    };

    const drawBottomBar = () => {
        const barHeight = 70;
        const yPos = elements.canvas.height - barHeight;
        const textY = yPos + barHeight / 2;

        if (state.cardType && cardTypeData[state.cardType]) {
            ctx.fillStyle = cardTypeData[state.cardType].color;
            ctx.fillRect(0, yPos, elements.canvas.width, barHeight);
        }

        ctx.fillStyle = 'white';
        ctx.textBaseline = 'middle';

        if (state.cardType) {
            ctx.font = "bold 28px Noto Sans JP";
            const textMetrics = ctx.measureText(state.cardType);
            const textX = (elements.canvas.width - textMetrics.width) / 2;
            ctx.fillText(state.cardType, textX, textY);
        }

        ctx.font = '900 40px "Noto Sans JP", serif';
        if (state.showAtk) {
            ctx.fillText('ATK ', 30, textY);
            ctx.font = '900 64px "Noto Sans JP", serif';
            ctx.fillText(state.atk, 115, textY);
        }
        if (state.showHp) {
            ctx.font = '900 40px "Noto Sans JP", serif';
            ctx.fillText('HP', 495, textY);
            ctx.font = '900 64px "Noto Sans JP", serif';
            ctx.fillText(state.hp, 560, textY);
        }
        if (state.showLeaderHp) {
            ctx.font = '900 40px "Noto Sans JP", serif';
            ctx.fillText('HP', 465, textY);
            ctx.font = '900 64px "Noto Sans JP", serif';
            ctx.fillText(state.leaderHp, 530, textY);
        }
        ctx.textBaseline = 'alphabetic';
    };
    
    const drawEffects = () => {
        const effectTexts = Array.from(state.activeEffects.values()).map(e => e.name);
        if (effectTexts.length === 0) return;
        const textBlockHeight = effectTexts.length * 30 + 20;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        drawRoundedRect(ctx, 60, 610, 510, textBlockHeight, 10);
        ctx.fillStyle = 'white';
        ctx.font = '700 19px Noto Sans JP';
        effectTexts.forEach((text, i) => { ctx.fillText(text, 80, 645 + i * 30); });
    };

    function drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath(); ctx.moveTo(x + radius, y); ctx.lineTo(x + width - radius, y); ctx.arcTo(x + width, y, x + width, y + radius, radius); ctx.lineTo(x + width, y + height - radius); ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius); ctx.lineTo(x + radius, y + height); ctx.arcTo(x, y + height, x, y + height - radius, radius); ctx.lineTo(x, y + radius); ctx.arcTo(x, y, x + radius, y, radius); ctx.closePath(); ctx.fill();
    }

    // --- 更新・計算関数 ---
    const updateUIAvailability = () => {
        const activeCategories = new Set(Array.from(state.activeEffects.values()).map(e => e.category));

        // カードタイプの有効/無効を切り替え
        elements.cardTypeButtonsContainer.querySelectorAll('button').forEach(button => {
            const type = button.dataset.type;
            let isCompatible = true;
            for (const category of activeCategories) {
                const restrictions = categoryRestrictions[category];
                if (restrictions && !restrictions.includes(type)) {
                    isCompatible = false;
                    break;
                }
            }
            button.classList.toggle('disabled', !isCompatible);
        });

        // 効果カテゴリの有効/無効を切り替え
        elements.effectsMenu.querySelectorAll('.category-header').forEach(header => {
            const categoryName = header.textContent.trim();
            const restrictions = categoryRestrictions[categoryName];

            if (restrictions) {
                // This category has rules. Apply them.
                const isDisabled = state.cardType && !restrictions.includes(state.cardType);
                header.classList.toggle('disabled', isDisabled);
            } else {
                // This is a common category. It should always be enabled.
                header.classList.remove('disabled');
            }
        });
    };

    const updateAccordionHighlights = () => {
        elements.effectsMenu.querySelectorAll('.is-active-parent').forEach(el => el.classList.remove('is-active-parent'));
        for (const effect of state.activeEffects.values()) {
            const button = elements.effectsMenu.querySelector(`button[data-id="${effect.id}"]`);
            if (button) {
                const groupHeader = button.closest('.effect-group')?.querySelector('.effect-group-header');
                if (groupHeader) groupHeader.classList.add('is-active-parent');
                const categoryHeader = button.closest('.category-items')?.previousElementSibling;
                if (categoryHeader) categoryHeader.classList.add('is-active-parent');
            }
        }
    };

    const updateState = () => {
        const cardTypeCost = state.cardType ? cardTypeData[state.cardType].cost : 0;
        state.effectCost = 0;
        for (const effect of state.activeEffects.values()) {
            state.effectCost += effect.cost;
        }
        state.totalCost = state.atk + state.hp + state.effectCost + cardTypeCost - 4;
        elements.effectCostTotal.textContent = state.effectCost;
        elements.totalCost.textContent = state.totalCost;

        if (state.cardType === 'リーダー' && state.totalCost <= 1) {
            elements.totalCost.style.color = 'red';
        } else {
            elements.totalCost.style.color = '';
        }

        updateAccordionHighlights();
        updateUIAvailability();
        render();
    };

    // --- UI生成関数 ---
    const createCardTypeButtons = () => {
        Object.keys(cardTypeData).forEach(type => {
            const button = document.createElement('button');
            button.textContent = type;
            button.dataset.type = type;
            elements.cardTypeButtonsContainer.appendChild(button);
        });
    };

    const createEffectButtons = () => {
        const categories = {};
        state.allEffects.forEach(effect => {
            const category = effect.category || '未分類';
            if (!categories[category]) categories[category] = [];
            categories[category].push(effect);
        });

        elements.effectsMenu.innerHTML = '';
        for (const category in categories) {
            const categoryHeader = document.createElement('div');
            categoryHeader.className = 'category-header';
            categoryHeader.textContent = category;
            elements.effectsMenu.appendChild(categoryHeader);

            const itemsContainer = document.createElement('div');
            itemsContainer.className = 'category-items is-closed';
            categories[category].forEach(effect => {
                if (effect.isGroup && effect.variants.length > 1) {
                    const groupDiv = document.createElement('div');
                    groupDiv.className = 'effect-group';
                    const groupHeader = document.createElement('div');
                    groupHeader.className = 'effect-group-header';
                    groupHeader.textContent = effect.template;
                    groupHeader.dataset.template = effect.template;
                    const variantsDiv = document.createElement('div');
                    variantsDiv.className = 'effect-group-variants is-closed';
                    effect.variants.forEach(variant => {
                        const button = document.createElement('button');
                        button.textContent = variant.name;
                        button.dataset.id = variant.id;
                        button.dataset.template = effect.template;
                        variantsDiv.appendChild(button);
                    });
                    groupDiv.appendChild(groupHeader);
                    groupDiv.appendChild(variantsDiv);
                    itemsContainer.appendChild(groupDiv);
                } else {
                    const effectToDisplay = (effect.isGroup && effect.variants.length === 1) ? effect.variants[0] : effect;
                    const button = document.createElement('button');
                    button.textContent = effectToDisplay.name;
                    button.dataset.id = effectToDisplay.id;
                    if (effect.isGroup) button.dataset.template = effect.template;
                    itemsContainer.appendChild(button);
                }
            });
            elements.effectsMenu.appendChild(itemsContainer);
        }
    };

    const setupHoverAccordion = () => {
        // Hover functionality disabled as per user request.
    };
    
    // --- イベントハンドラ ---
    const getEffectLimit = () => {
        const cost = state.totalCost;
        if (cost >= 1 && cost <= 4) return 4;
        if (cost >= 5 && cost <= 8) return 5;
        if (cost >= 9 && cost <= 10) return 6;
        return Infinity;
    };

    const handleEffectSearch = (e) => {
        const searchTerm = e.target.value.toLowerCase();
        elements.effectsMenu.querySelectorAll('.category-header').forEach(header => {
            const itemsContainer = header.nextElementSibling;
            let categoryHasVisibleItems = false;
            itemsContainer.querySelectorAll('button, .effect-group-header').forEach(item => {
                const itemName = item.textContent.toLowerCase();
                const isMatch = itemName.includes(searchTerm);
                item.style.display = isMatch ? '' : 'none';
                if(isMatch) categoryHasVisibleItems = true;
            });
            header.style.display = categoryHasVisibleItems ? '' : 'none';
            if (searchTerm && categoryHasVisibleItems) {
                itemsContainer.classList.remove('is-closed');
                header.classList.add('is-open');
            }
        });
    };

    const setupEventListeners = () => {
        elements.cardNameInput.addEventListener('input', e => { state.cardName = e.target.value; render(); });
        
        elements.cardNameSizeGroup.addEventListener('click', e => {
            if(e.target.tagName !== 'BUTTON') return;
            state.cardNameSize = parseInt(e.target.dataset.size, 10);
            elements.cardNameSizeGroup.querySelector('.active')?.classList.remove('active');
            e.target.classList.add('active');
            render();
        });

        elements.previewSizeGroup.addEventListener('click', e => {
            if(e.target.tagName !== 'BUTTON') return;
            const size = e.target.dataset.size;
            elements.canvas.style.width = size + '%';
            elements.previewSizeGroup.querySelector('.active')?.classList.remove('active');
            e.target.classList.add('active');
        });

        elements.imageUpload.addEventListener('change', function () {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        state.uploadedImage = img;
                        const scale = Math.max(elements.canvas.width / img.width, elements.canvas.height / img.height);
                        state.imageScale = scale;
                        state.imagePosX = 0;
                        state.imagePosY = 0;
                        elements.imageZoom.value = scale;
                        elements.imagePosX.value = 0;
                        elements.imagePosY.value = 0;
                        render();
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(this.files[0]);
            }
        });

        elements.imageZoom.addEventListener('input', e => { state.imageScale = parseFloat(e.target.value); render(); });
        elements.imagePosX.addEventListener('input', e => { state.imagePosX = parseInt(e.target.value, 10); render(); });
        elements.imagePosY.addEventListener('input', e => { state.imagePosY = parseInt(e.target.value, 10); render(); });

        elements.imageCenterButton.addEventListener('click', () => {
            if (!state.uploadedImage) return;
            const img = state.uploadedImage;
            const scale = Math.max(elements.canvas.width / img.width, elements.canvas.height / img.height);
            state.imageScale = scale;
            state.imagePosX = 0;
            state.imagePosY = 0;
            elements.imageZoom.value = scale;
            elements.imagePosX.value = 0;
            elements.imagePosY.value = 0;
            render();
        });

        elements.cardTypeButtonsContainer.addEventListener('click', e => {
            if (e.target.tagName !== 'BUTTON' || e.target.classList.contains('disabled')) return;
            const type = e.target.dataset.type;
            state.cardType = state.cardType === type ? null : type;
            elements.cardTypeButtonsContainer.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
            if (state.cardType) e.target.classList.add('active');

            const setStatus = (show, value, name) => {
                state[name] = value;
                state[`show${name.charAt(0).toUpperCase() + name.slice(1)}`] = show;
                elements[name].value.textContent = value;

                const controlWrapper = elements[name].value.closest('.status-item');
                if (controlWrapper) {
                    controlWrapper.style.display = show ? '' : 'none';
                }
            };

            // まず全てのステータスを表示状態に戻す
            setStatus(true, state.atk, 'atk');
            setStatus(true, state.hp, 'hp');

            state.showLeaderHp = (state.cardType === 'リーダー');

            switch (state.cardType) {
                case '防具':
                    setStatus(false, 2, 'atk');
                    break;
                case '建物':
                case 'スキル':
                case 'トラップ':
                case 'リーダー':
                    setStatus(false, 2, 'atk');
                    setStatus(false, 2, 'hp');
                    break;
            }

            updateState();
        });

        const setupStatusHandler = (name, min, max) => {
            elements[name].increment.addEventListener('click', () => {
                if (state[name] < max) state[name]++;
                elements[name].value.textContent = state[name];
                updateState();
            });
            elements[name].decrement.addEventListener('click', () => {
                if (state[name] > min) state[name]--;
                elements[name].value.textContent = state[name];
                updateState();
            });
        };
        setupStatusHandler('atk', 1, 9); setupStatusHandler('hp', 1, 9);

        elements.effectsMenu.addEventListener('click', e => {
            const target = e.target;
            if (target.classList.contains('category-header') || target.classList.contains('effect-group-header')) {
                if (target.classList.contains('disabled')) return;
                target.nextElementSibling.classList.toggle('is-closed');
                target.classList.toggle('is-open');
                return;
            }

            if (target.tagName !== 'BUTTON') return;

            const id = parseInt(target.dataset.id, 10);
            const isAdding = !target.classList.contains('active');
            const effectLimit = getEffectLimit();

            if (isAdding && state.activeEffects.size >= effectLimit) {
                alert(`コスト${state.totalCost}のカードには、効果を${effectLimit}個までしか追加できません。`);
                return;
            }

            const template = target.dataset.template;
            const allOriginalEffects = state.allEffects.flatMap(e => e.isGroup ? e.variants : e);
            const effect = allOriginalEffects.find(e => e.id === id);
            if (!effect) return;

            // Check for compatibility before adding
            if (isAdding && state.cardType) {
                const restrictions = categoryRestrictions[effect.category];
                if (restrictions && !restrictions.includes(state.cardType)) {
                    alert(`選択中のカードタイプ「${state.cardType}」には、カテゴリ「${effect.category}」の効果は追加できません。`);
                    return;
                }
            }

            if (template) {
                const activeIdInGroup = state.activeTemplateMap.get(template);
                if (activeIdInGroup === id) {
                    state.activeEffects.delete(id);
                    state.activeTemplateMap.delete(template);
                    target.classList.remove('active');
                } else {
                    if (activeIdInGroup) {
                        state.activeEffects.delete(activeIdInGroup);
                        const oldButton = document.querySelector(`button[data-id="${activeIdInGroup}"]`);
                        if(oldButton) oldButton.classList.remove('active');
                    }
                    state.activeEffects.set(id, { ...effect });
                    state.activeTemplateMap.set(template, id);
                    target.classList.add('active');
                }
            } else {
                if (state.activeEffects.has(id)) {
                    state.activeEffects.delete(id);
                    target.classList.remove('active');
                } else {
                    let effectToAdd = { ...effect };
                    if (effect.isCustom) {
                        const newValue = prompt('新しい値を入力してください', effect.name);
                        if (newValue === null) return;
                        effectToAdd.name = newValue || effect.name;
                    }
                    state.activeEffects.set(id, effectToAdd);
                    target.classList.add('active');
                }
            }
            updateState();
        });

        elements.effectSearchInput.addEventListener('input', handleEffectSearch);

        elements.resetEffectsButton.addEventListener('click', () => {
            state.activeEffects.clear();
            state.activeTemplateMap.clear();
            elements.effectsMenu.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
            updateState();
        });

        elements.expandCollapseEffectsButton.addEventListener('click', e => {
            const button = e.target;
            const shouldExpand = elements.effectsMenu.querySelector('.is-closed');
    
            if (shouldExpand) {
                elements.effectsMenu.querySelectorAll('.is-closed').forEach(el => el.classList.remove('is-closed'));
                elements.effectsMenu.querySelectorAll('.category-header, .effect-group-header').forEach(el => el.classList.add('is-open'));
                button.textContent = 'すべて閉じる';
            } else {
                elements.effectsMenu.querySelectorAll('.category-items, .effect-group-variants').forEach(el => el.classList.add('is-closed'));
                elements.effectsMenu.querySelectorAll('.category-header, .effect-group-header').forEach(el => el.classList.remove('is-open'));
                button.textContent = 'すべて展開';
            }
        });

        elements.saveButton.addEventListener('click', () => {
            const link = document.createElement('a');
            link.href = elements.canvas.toDataURL('image/png');
            link.download = `${state.cardName || 'card'}.png`;
            link.click();
        });
    };

    // --- 初期化関数 ---
    const groupSimilarEffects = (effects) => {
        const effectGroups = new Map();
        const noGroupKeywords = ['2回攻撃'];
        const romanMap = { 'Ⅰ': 1, 'Ⅱ': 2, 'Ⅲ': 3, 'Ⅳ': 4, 'Ⅴ': 5 };

        effects.forEach(effect => {
            if (noGroupKeywords.includes(effect.name) || effect.isCustom) {
                effectGroups.set(effect.name, effect);
                return;
            }

            let template = null;

            const romanMatch = effect.name.match(/^(ドレイン)(Ⅰ|Ⅱ|Ⅲ|Ⅳ|Ⅴ)$/);
            if (romanMatch) {
                template = `${romanMatch[1]}○`;
                effect.value = romanMap[romanMatch[2]];
            } else {
                const match = effect.name.match(/(\d+)/); // Find first number
                if (match) {
                    const numStr = match[0];
                    const numIndex = effect.name.indexOf(numStr);
                    template = `${effect.name.substring(0, numIndex)}○${effect.name.substring(numIndex + numStr.length)}`;
                }
            }

            if (template) {
                if (!effectGroups.has(template)) {
                    effectGroups.set(template, {
                        isGroup: true,
                        template: template,
                        category: effect.category,
                        variants: []
                    });
                }
                effectGroups.get(template).variants.push(effect);
            } else {
                effectGroups.set(effect.name, effect);
            }
        });

        return Array.from(effectGroups.values());
    };

    const init = async () => {
        const initialPreviewSize = elements.previewSizeGroup.querySelector('.active').dataset.size;
        elements.canvas.style.width = initialPreviewSize + '%';
        createCardTypeButtons();
        setupEventListeners();

        try {
            const response = await fetch('assets/data.csv');
            const csvText = await response.text();
            const jsonData = csvText.trim().split('\n').map(line => line.split(','));

            const parsedEffects = jsonData.map((row, index) => ({
                id: index,
                name: row[0],
                cost: parseInt(row[1], 10) || 0,
                category: row[2],
                isCustom: row[4] === 'X'
            })).filter(e => e.name && e.name.trim());

            state.allEffects = groupSimilarEffects(parsedEffects);

            createEffectButtons();
            setupHoverAccordion();

        } catch (error) {
            console.error('Failed to load assets:', error);
        }

        updateState();
    };

    init();
});
