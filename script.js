// Pocket Timelock Journal - JavaScript Functionality

class PocketTimelockJournal {
    constructor() {
        this.entries = [];
        this.currentEntry = null;
        this.currentScreen = 'entry-list';
        this.autosaveTimeout = null;
        this.pinData = null;
        
        this.init();
    }

    // Initialize the application
    init() {
        this.loadData();
        this.bindEvents();
        this.renderEntryList();
        this.showScreen('entry-list-screen');
    }

    // Data Management
    loadData() {
        try {
            const entriesData = localStorage.getItem('timelock-entries');
            this.entries = entriesData ? JSON.parse(entriesData) : [];
            
            const pinData = localStorage.getItem('timelock-pin');
            this.pinData = pinData ? JSON.parse(pinData) : null;
        } catch (error) {
            console.error('Error loading data:', error);
            this.entries = [];
            this.pinData = null;
        }
    }

    saveData() {
        try {
            localStorage.setItem('timelock-entries', JSON.stringify(this.entries));
            if (this.pinData) {
                localStorage.setItem('timelock-pin', JSON.stringify(this.pinData));
            } else {
                localStorage.removeItem('timelock-pin');
            }
        } catch (error) {
            console.error('Error saving data:', error);
            this.showToast('Error saving data', 'error');
        }
    }

    // Entry Management
    createEntry() {
        const now = new Date();
        const entry = {
            id: this.generateId(),
            title: '',
            content: '',
            createdAt: now.toISOString(),
            editedAt: now.toISOString(),
            isSealed: false,
            locked: false, // <-- new: pin-locked state
            hash: null
        };
        
        this.entries.unshift(entry);
        this.currentEntry = entry;
        this.saveData();
        this.showEditor();
    }

    updateEntry(id, updates) {
        const entry = this.entries.find(e => e.id === id);
        if (!entry || entry.isSealed) return false;
        
        // Prevent updates when locked (unless unlocked for session)
        if (entry.locked && !entry.unlockedForSession) return false;
        
        Object.assign(entry, updates);
        entry.editedAt = new Date().toISOString();
        this.saveData();
        return true;
    }

    sealEntry(id) {
        const entry = this.entries.find(e => e.id === id);
        if (!entry || entry.isSealed) return false;
        
        entry.isSealed = true;
        entry.hash = this.generateHash(entry.title + entry.content + entry.editedAt);
        // sealed entries should also be considered locked logically
        entry.locked = false;
        entry.unlockedForSession = false;
        this.saveData();
        this.showToast('Entry sealed successfully', 'success');
        return true;
    }

    async deleteEntry(id) {
        const entry = this.entries.find(e => e.id === id);
        if (!entry) return false;
        
        // Check if PIN is required for sealed entries or locked entries (if PIN protection enabled)
        if ((entry.isSealed || entry.locked) && this.pinData) {
            const confirmed = await this.showConfirmation(
                entry.isSealed ? 'Delete Sealed Entry' : 'Delete Locked Entry',
                entry.isSealed
                    ? 'This will permanently delete a sealed memory. This action cannot be undone.'
                    : 'This will delete a PIN-locked entry. You will need to verify your PIN to proceed.'
            );
            
            if (!confirmed) return false;
            
            const pinVerified = await this.verifyPin('Enter your PIN to delete this entry:');
            if (!pinVerified) return false;
        } else {
            const confirmed = await this.showConfirmation(
                'Delete Entry',
                'Are you sure you want to delete this entry?'
            );
            
            if (!confirmed) return false;
        }
        
        this.entries = this.entries.filter(e => e.id !== id);
        this.saveData();
        this.showToast('Entry deleted', 'success');
        
        if (this.currentEntry && this.currentEntry.id === id) {
            this.showScreen('entry-list-screen');
        }
        
        this.renderEntryList();
        return true;
    }

    // UI Management
    showScreen(screenId) {
        const screens = document.querySelectorAll('.screen');
        screens.forEach(screen => {
            screen.classList.remove('active');
        });
        
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.currentScreen = screenId;
        }
    }

    showEditor(entry = null) {
        if (entry) {
            this.currentEntry = entry;
        }
        
        this.showScreen('entry-editor-screen');
        this.populateEditor();
        this.updateTimestamps();
        
        // Notify the bridge about the opened entry so it can update lock UI
        if (this.currentEntry) {
            window.dispatchEvent(new CustomEvent('entry-opened', {
                detail: {
                    entryId: this.currentEntry.id,
                    locked: !!this.currentEntry.locked,
                    sealed: !!this.currentEntry.isSealed
                }
            }));
        }
        
        // Focus on title if empty, otherwise content
        setTimeout(() => {
            const titleInput = document.getElementById('entry-title');
            const contentInput = document.getElementById('entry-content');
            
            if (!this.currentEntry.title) {
                titleInput.focus();
            } else {
                contentInput.focus();
                contentInput.setSelectionRange(contentInput.value.length, contentInput.value.length);
            }
        }, 100);
    }

    populateEditor() {
        if (!this.currentEntry) return;
        
        const titleInput = document.getElementById('entry-title');
        const contentInput = document.getElementById('entry-content');
        const sealBtn = document.getElementById('seal-btn');
        
        titleInput.value = this.currentEntry.title;
        contentInput.value = this.currentEntry.content;
        
        // Disable editing if sealed or locked (unless unlocked for session)
        const isSealed = this.currentEntry.isSealed;
        const isLocked = !!this.currentEntry.locked;
        const unlockedForSession = !!this.currentEntry.unlockedForSession;

        titleInput.disabled = isSealed || (isLocked && !unlockedForSession);
        contentInput.disabled = isSealed || (isLocked && !unlockedForSession);
        sealBtn.disabled = isSealed;
        
        if (isSealed) {
            sealBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <circle cx="12" cy="16" r="1"></circle>
                    <path d="M7 11V7a5 5 0 0110 0v4"></path>
                </svg>
            `;
        }
    }

    updateTimestamps() {
        if (!this.currentEntry) return;
        
        const createdTime = document.getElementById('created-time');
        const editedTime = document.getElementById('edited-time');
        
        createdTime.textContent = `Created: ${this.formatDate(this.currentEntry.createdAt)}`;
        editedTime.textContent = `Edited: ${this.formatDate(this.currentEntry.editedAt)}`;
    }

    renderEntryList() {
        const entryList = document.getElementById('entry-list');
        const emptyState = document.getElementById('empty-state');
        
        if (this.entries.length === 0) {
            emptyState.style.display = 'block';
            entryList.style.display = 'none';
            return;
        }
        
        emptyState.style.display = 'none';
        entryList.style.display = 'block';
        
        entryList.innerHTML = this.entries.map(entry => this.createEntryCard(entry)).join('');
    }

    createEntryCard(entry) {
        const title = entry.title || 'Untitled Entry';
        const preview = entry.content.substring(0, 150) + (entry.content.length > 150 ? '...' : '');
        const sealIcon = entry.isSealed ? `
            <div class="seal-indicator">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <circle cx="12" cy="16" r="1"></circle>
                    <path d="M7 11V7a5 5 0 0110 0v4"></path>
                </svg>
                Sealed
            </div>
        ` : '';

        const lockIcon = entry.locked ? `
            <div class="lock-indicator">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0110 0v4"></path>
                </svg>
                Locked
            </div>
        ` : '';
        
        return `
            <div class="entry-card ${entry.isSealed ? 'sealed' : ''} ${entry.locked ? 'locked' : ''}" data-entry-id="${entry.id}">
                <div class="entry-header">
                    <div>
                        <div class="entry-title ${!entry.title ? 'untitled' : ''}">${title}</div>
                        <div class="entry-meta">
                            <span>${this.formatDate(entry.createdAt)}</span>
                            ${sealIcon}
                            ${lockIcon}
                        </div>
                    </div>
                </div>
                ${preview ? `<div class="entry-preview">${preview}</div>` : ''}
            </div>
        `;
    }

    // Autosave functionality
    setupAutosave() {
        const titleInput = document.getElementById('entry-title');
        const contentInput = document.getElementById('entry-content');
        
        const handleInput = () => {
            if (!this.currentEntry || this.currentEntry.isSealed) return;
            if (this.currentEntry.locked && !this.currentEntry.unlockedForSession) return; // block autosave when locked
            
            this.showAutosaveStatus('saving');
            
            clearTimeout(this.autosaveTimeout);
            this.autosaveTimeout = setTimeout(() => {
                this.updateEntry(this.currentEntry.id, {
                    title: titleInput.value,
                    content: contentInput.value
                });
                this.showAutosaveStatus('saved');
                this.updateTimestamps();
            }, 1000);
        };
        
        titleInput.addEventListener('input', handleInput);
        contentInput.addEventListener('input', handleInput);
    }

    showAutosaveStatus(status) {
        const indicator = document.getElementById('autosave-indicator');
        const text = indicator.querySelector('.autosave-text');
        
        indicator.className = `autosave-indicator ${status}`;
        
        switch (status) {
            case 'saving':
                text.textContent = 'Saving...';
                break;
            case 'saved':
                text.textContent = 'Saved';
                setTimeout(() => {
                    if (indicator.classList.contains('saved')) {
                        indicator.className = 'autosave-indicator';
                        text.textContent = 'Saved';
                    }
                }, 2000);
                break;
        }
    }

    // Event Binding
    bindEvents() {
        // Navigation
        document.getElementById('new-entry-btn').addEventListener('click', () => this.createEntry());
        document.getElementById('back-btn').addEventListener('click', () => {
            // Clear unlocked session flag when leaving editor
            if (this.currentEntry) {
                this.currentEntry.unlockedForSession = false;
            }
            this.showScreen('entry-list-screen');
            this.renderEntryList();
        });
        document.getElementById('settings-btn').addEventListener('click', () => this.showSettings());
        document.getElementById('settings-back-btn').addEventListener('click', () => this.showScreen('entry-list-screen'));
        
        // Entry actions
        document.getElementById('seal-btn').addEventListener('click', () => {
            if (this.currentEntry && !this.currentEntry.isSealed) {
                this.showSealConfirmation();
            }
        });
        
        document.getElementById('delete-entry-btn').addEventListener('click', () => {
            if (this.currentEntry) {
                this.deleteEntry(this.currentEntry.id);
            }
        });
        
        // Entry list clicks
        document.getElementById('entry-list').addEventListener('click', (e) => {
            const entryCard = e.target.closest('.entry-card');
            if (entryCard) {
                const entryId = entryCard.dataset.entryId;
                const entry = this.entries.find(e => e.id === entryId);
                if (entry) {
                    this.showEditor(entry);
                }
            }
        });
        
        // Settings
        document.getElementById('setup-pin-btn').addEventListener('click', () => this.showPinSetup());
        document.getElementById('change-pin-btn').addEventListener('click', () => this.showPinChange());
        document.getElementById('remove-pin-btn').addEventListener('click', () => this.removePinProtection());
        document.getElementById('export-data-btn').addEventListener('click', () => this.exportData());
        document.getElementById('clear-all-btn').addEventListener('click', () => this.clearAllData());
        
        // Setup autosave
        this.setupAutosave();

        // Listen for pin-lock bridge events
        window.addEventListener('pin-lock-request-state', (e) => {
            const entryId = e.detail && e.detail.entryId;
            const editor = document.getElementById('entry-editor-screen');
            if (!editor) return;
            const entry = this.entries.find(en => en.id === entryId);
            editor.dataset.locked = entry && entry.locked ? 'true' : 'false';
        });

        window.addEventListener('pin-lock-toggle', async (e) => {
            const { entryId, willLock } = e.detail || {};
            if (!entryId) return;
            const entry = this.entries.find(en => en.id === entryId);
            if (!entry) return;

            // If trying to lock but no PIN configured, open PIN setup
            if (willLock && !this.pinData) {
                await this.showPinSetup();
                if (!this.pinData) {
                    // user didn't set PIN; revert UI by dispatching state-changed with locked=false
                    window.dispatchEvent(new CustomEvent('pin-lock-state-changed', { detail: { entryId, locked: false } }));
                    return;
                }
            }

            if (willLock) {
                // Lock the entry
                entry.locked = true;
                entry.unlockedForSession = false;
                this.saveData();
                window.dispatchEvent(new CustomEvent('pin-lock-state-changed', { detail: { entryId, locked: true } }));
                window.dispatchEvent(new CustomEvent('render-lock-indicator', { detail: { entryId, locked: true } }));
                this.showToast('Entry locked with PIN', 'success');
                this.renderEntryList();
            } else {
                // Unlock: require PIN verification
                const ok = await this.verifyPin('Enter your PIN to unlock this entry:');
                if (!ok) {
                    // Revert UI state back to locked
                    window.dispatchEvent(new CustomEvent('pin-lock-state-changed', { detail: { entryId, locked: true } }));
                    return;
                }
                entry.locked = false;
                // mark session unlocked so edits allowed during this open editor
                entry.unlockedForSession = true;
                this.saveData();
                window.dispatchEvent(new CustomEvent('pin-lock-state-changed', { detail: { entryId, locked: false } }));
                window.dispatchEvent(new CustomEvent('render-lock-indicator', { detail: { entryId, locked: false } }));
                this.showToast('Entry unlocked', 'success');
                // update UI now that unlockedForSession changed
                if (this.currentEntry && this.currentEntry.id === entryId) this.populateEditor();
                this.renderEntryList();
            }
        });
        
        // Modal events will be bound when modals are shown
    }

    // Settings
    showSettings() {
        this.showScreen('settings-screen');
        this.updatePinStatus();
    }

    updatePinStatus() {
        const pinNotSet = document.getElementById('pin-not-set');
        const pinSet = document.getElementById('pin-set');
        
        if (this.pinData) {
            pinNotSet.classList.add('hidden');
            pinSet.classList.remove('hidden');
        } else {
            pinNotSet.classList.remove('hidden');
            pinSet.classList.add('hidden');
        }
    }

    // Utility functions
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    generateHash(input) {
        // Simple hash function for demonstration
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            const char = input.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(16);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else if (diffDays === 2) {
            return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else if (diffDays <= 7) {
            return `${diffDays - 1} days ago`;
        } else {
            return date.toLocaleDateString([], { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }

    // Toast notifications
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => container.removeChild(toast), 300);
        }, 3000);
    }

    // Confirmation dialog
    showConfirmation(title, message) {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirmation-modal');
            const titleEl = document.getElementById('confirmation-title');
            const messageEl = document.getElementById('confirmation-message');
            const cancelBtn = document.getElementById('confirmation-cancel-btn');
            const confirmBtn = document.getElementById('confirmation-confirm-btn');
            
            titleEl.textContent = title;
            messageEl.textContent = message;
            
            const handleCancel = () => {
                modal.classList.remove('active');
                resolve(false);
                cleanup();
            };
            
            const handleConfirm = () => {
                modal.classList.remove('active');
                resolve(true);
                cleanup();
            };
            
            const cleanup = () => {
                cancelBtn.removeEventListener('click', handleCancel);
                confirmBtn.removeEventListener('click', handleConfirm);
            };
            
            cancelBtn.addEventListener('click', handleCancel);
            confirmBtn.addEventListener('click', handleConfirm);
            
            modal.classList.add('active');
        });
    }

    // Seal confirmation
    async showSealConfirmation() {
        const confirmed = await this.showConfirmation(
            'Seal Entry',
            'Seal this memory? Once sealed, its content and timestamp will be locked forever and cannot be edited. This action is irreversible.'
        );
        
        if (confirmed) {
            this.sealEntry(this.currentEntry.id);
            this.populateEditor();
            this.renderEntryList();
        }
    }

    // Data export
    exportData() {
        try {
            const data = {
                entries: this.entries,
                exportDate: new Date().toISOString(),
                version: '1.0'
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `timelock-journal-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showToast('Data exported successfully', 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.showToast('Error exporting data', 'error');
        }
    }

    // Clear all data
    async clearAllData() {
        const confirmed = await this.showConfirmation(
            'Clear All Data',
            'This will permanently delete all entries and settings. This action cannot be undone.'
        );
        
        if (confirmed) {
            localStorage.removeItem('timelock-entries');
            localStorage.removeItem('timelock-pin');
            this.entries = [];
            this.pinData = null;
            this.currentEntry = null;
            this.renderEntryList();
            this.updatePinStatus();
            this.showToast('All data cleared', 'success');
        }
    }

    // PIN Security System
    async showPinSetup() {
        const modal = document.getElementById('pin-setup-modal');
        const titleEl = document.getElementById('pin-modal-title');
        const step1 = document.getElementById('pin-step-1');
        const step2 = document.getElementById('pin-step-2');
        const securityStep = document.getElementById('security-question-step');
        const pinInput1 = document.getElementById('pin-input-1');
        const pinInput2 = document.getElementById('pin-input-2');
        const questionInput = document.getElementById('security-question-input');
        const answerInput = document.getElementById('security-answer-input');
        const errorEl = document.getElementById('pin-error');
        const cancelBtn = document.getElementById('pin-cancel-btn');
        const continueBtn = document.getElementById('pin-continue-btn');
        const closeBtn = document.getElementById('pin-modal-close');
        
        let currentStep = 1;
        let tempPin = '';
        
        const resetModal = () => {
            currentStep = 1;
            tempPin = '';
            pinInput1.value = '';
            pinInput2.value = '';
            questionInput.value = '';
            answerInput.value = '';
            errorEl.textContent = '';
            
            step1.classList.remove('hidden');
            step2.classList.add('hidden');
            securityStep.classList.add('hidden');
            
            titleEl.textContent = 'Set Up PIN';
            continueBtn.textContent = 'Continue';
        };
        
        const handleContinue = async () => {
            errorEl.textContent = '';
            
            if (currentStep === 1) {
                const pin = pinInput1.value.trim();
                if (!/^\d{4}$/.test(pin)) {
                    errorEl.textContent = 'Please enter a 4-digit PIN';
                    return;
                }
                
                tempPin = pin;
                currentStep = 2;
                step1.classList.add('hidden');
                step2.classList.remove('hidden');
                titleEl.textContent = 'Confirm PIN';
                pinInput2.focus();
                
            } else if (currentStep === 2) {
                const confirmPin = pinInput2.value.trim();
                if (confirmPin !== tempPin) {
                    errorEl.textContent = 'PINs do not match';
                    return;
                }
                
                currentStep = 3;
                step2.classList.add('hidden');
                securityStep.classList.remove('hidden');
                titleEl.textContent = 'Security Question';
                continueBtn.textContent = 'Complete Setup';
                questionInput.focus();
                
            } else if (currentStep === 3) {
                const question = questionInput.value.trim();
                const answer = answerInput.value.trim();
                
                if (!question || !answer) {
                    errorEl.textContent = 'Please fill in both the question and answer';
                    return;
                }
                
                if (question.length < 10) {
                    errorEl.textContent = 'Security question must be at least 10 characters';
                    return;
                }
                
                if (answer.length < 3) {
                    errorEl.textContent = 'Answer must be at least 3 characters';
                    return;
                }
                
                // Save PIN and security question
                this.pinData = {
                    hash: await this.hashPin(tempPin),
                    securityQuestion: question,
                    securityAnswerHash: await this.hashPin(answer.toLowerCase())
                };
                
                this.saveData();
                this.updatePinStatus();
                modal.classList.remove('active');
                this.showToast('PIN protection enabled', 'success');
                cleanup();
            }
        };
        
        const handleCancel = () => {
            modal.classList.remove('active');
            cleanup();
        };
        
        const cleanup = () => {
            cancelBtn.removeEventListener('click', handleCancel);
            continueBtn.removeEventListener('click', handleContinue);
            closeBtn.removeEventListener('click', handleCancel);
            pinInput1.removeEventListener('keypress', handleEnter);
            pinInput2.removeEventListener('keypress', handleEnter);
            questionInput.removeEventListener('keypress', handleEnter);
            answerInput.removeEventListener('keypress', handleEnter);
        };
        
        const handleEnter = (e) => {
            if (e.key === 'Enter') {
                handleContinue();
            }
        };
        
        resetModal();
        cancelBtn.addEventListener('click', handleCancel);
        continueBtn.addEventListener('click', handleContinue);
        closeBtn.addEventListener('click', handleCancel);
        pinInput1.addEventListener('keypress', handleEnter);
        pinInput2.addEventListener('keypress', handleEnter);
        questionInput.addEventListener('keypress', handleEnter);
        answerInput.addEventListener('keypress', handleEnter);
        
        modal.classList.add('active');
        pinInput1.focus();
    }

    async showPinChange() {
        // First verify current PIN
        const currentPinVerified = await this.verifyPin('Enter your current PIN:');
        if (!currentPinVerified) return;
        
        // Show PIN setup modal for new PIN
        await this.showPinSetup();
    }

    async removePinProtection() {
        const pinVerified = await this.verifyPin('Enter your PIN to remove protection:');
        if (!pinVerified) return;
        
        const confirmed = await this.showConfirmation(
            'Remove PIN Protection',
            'Are you sure you want to remove PIN protection? Sealed entries will no longer require a PIN to delete.'
        );
        
        if (confirmed) {
            this.pinData = null;
            localStorage.removeItem('timelock-pin');
            this.updatePinStatus();
            this.showToast('PIN protection removed', 'success');
        }
    }

    verifyPin(message) {
        return new Promise((resolve) => {
            if (!this.pinData) {
                resolve(true);
                return;
            }
            
            const modal = document.getElementById('pin-verify-modal');
            const messageEl = document.getElementById('pin-verify-message');
            const pinInput = document.getElementById('pin-verify-input');
            const errorEl = document.getElementById('pin-verify-error');
            const cancelBtn = document.getElementById('pin-verify-cancel-btn');
            const submitBtn = document.getElementById('pin-verify-submit-btn');
            const forgotBtn = document.getElementById('forgot-pin-btn');
            
            messageEl.textContent = message;
            pinInput.value = '';
            errorEl.textContent = '';
            
            const handleSubmit = async () => {
                const pin = pinInput.value.trim();
                if (!/^\d{4}$/.test(pin)) {
                    errorEl.textContent = 'Please enter a 4-digit PIN';
                    return;
                }
                
                const isValid = await this.validatePin(pin);
                if (isValid) {
                    modal.classList.remove('active');
                    resolve(true);
                    cleanup();
                } else {
                    errorEl.textContent = 'Incorrect PIN';
                    pinInput.value = '';
                    pinInput.focus();
                }
            };
            
            const handleCancel = () => {
                modal.classList.remove('active');
                resolve(false);
                cleanup();
            };
            
            const handleForgotPin = async () => {
                modal.classList.remove('active');
                const recovered = await this.showPinRecovery();
                resolve(recovered);
                cleanup();
            };
            
            const handleEnter = (e) => {
                if (e.key === 'Enter') {
                    handleSubmit();
                }
            };
            
            const cleanup = () => {
                cancelBtn.removeEventListener('click', handleCancel);
                submitBtn.removeEventListener('click', handleSubmit);
                forgotBtn.removeEventListener('click', handleForgotPin);
                pinInput.removeEventListener('keypress', handleEnter);
            };
            
            cancelBtn.addEventListener('click', handleCancel);
            submitBtn.addEventListener('click', handleSubmit);
            forgotBtn.addEventListener('click', handleForgotPin);
            pinInput.addEventListener('keypress', handleEnter);
            
            modal.classList.add('active');
            pinInput.focus();
        });
    }

    showPinRecovery() {
        return new Promise((resolve) => {
            if (!this.pinData || !this.pinData.securityQuestion) {
                this.showToast('No security question set up', 'error');
                resolve(false);
                return;
            }
            
            const modal = document.getElementById('pin-recovery-modal');
            const questionDisplay = document.getElementById('security-question-display');
            const answerInput = document.getElementById('security-answer-verify');
            const errorEl = document.getElementById('recovery-error');
            const cancelBtn = document.getElementById('recovery-cancel-btn');
            const submitBtn = document.getElementById('recovery-submit-btn');
            const closeBtn = document.getElementById('recovery-modal-close');
            
            questionDisplay.textContent = this.pinData.securityQuestion;
            answerInput.value = '';
            errorEl.textContent = '';
            
            const handleSubmit = async () => {
                const answer = answerInput.value.trim().toLowerCase();
                if (!answer) {
                    errorEl.textContent = 'Please enter your answer';
                    return;
                }
                
                const isValid = await this.validateSecurityAnswer(answer);
                if (isValid) {
                    modal.classList.remove('active');
                    this.showToast('PIN verification bypassed', 'success');
                    resolve(true);
                    cleanup();
                } else {
                    errorEl.textContent = 'Incorrect answer';
                    answerInput.value = '';
                    answerInput.focus();
                }
            };
            
            const handleCancel = () => {
                modal.classList.remove('active');
                resolve(false);
                cleanup();
            };
            
            const handleEnter = (e) => {
                if (e.key === 'Enter') {
                    handleSubmit();
                }
            };
            
            const cleanup = () => {
                cancelBtn.removeEventListener('click', handleCancel);
                submitBtn.removeEventListener('click', handleSubmit);
                closeBtn.removeEventListener('click', handleCancel);
                answerInput.removeEventListener('keypress', handleEnter);
            };
            
            cancelBtn.addEventListener('click', handleCancel);
            submitBtn.addEventListener('click', handleSubmit);
            closeBtn.addEventListener('click', handleCancel);
            answerInput.addEventListener('keypress', handleEnter);
            
            modal.classList.add('active');
            answerInput.focus();
        });
    }

    // PIN Hashing and Validation
    async hashPin(input) {
        // Use Web Crypto API for secure hashing
        const encoder = new TextEncoder();
        const data = encoder.encode(input + 'timelock-salt'); // Add salt for security
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async validatePin(pin) {
        if (!this.pinData) return true;
        const hashedInput = await this.hashPin(pin);
        return hashedInput === this.pinData.hash;
    }

    async validateSecurityAnswer(answer) {
        if (!this.pinData || !this.pinData.securityAnswerHash) return false;
        const hashedInput = await this.hashPin(answer);
        return hashedInput === this.pinData.securityAnswerHash;
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.journal = new PocketTimelockJournal();
});

// Service Worker registration for PWA functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
