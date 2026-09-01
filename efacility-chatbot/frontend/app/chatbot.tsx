'use client';

import { FormEvent, KeyboardEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  BotMessage,
  BookingCardData,
  ChatResponse,
  FormCard,
  FormField,
  LookupOption,
  SeatCard,
  UserMessage,
  createSession,
  lookupAmenities,
  lookupBuildings,
  lookupFloors,
  lookupSites,
  setAccessToken,
  sendMessage,
} from './chat-api';

interface DisplayMessage {
  from: 'user' | 'bot';
  botMessage?: BotMessage;
  userText?: string;
  timestamp: Date;
}

interface FormCardState {
  card: FormCard;
  values: Record<string, unknown>;
  dropdownOptions: Record<string, LookupOption[]>;
  loading: Record<string, boolean>;
  errors: Record<string, string>;
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeFormCard, setActiveFormCard] = useState<FormCardState | null>(null);
  const [activeDropdownKey, setActiveDropdownKey] = useState<string | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<SeatCard[]>([]);
  const [seatHeadcount, setSeatHeadcount] = useState(1);
  const [bookingTabLoading, setBookingTabLoading] = useState<'upcoming' | 'past' | 'cancelled' | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const replaceBookingListRef = useRef(false);
  const replaceRebookCalendarRef = useRef(false);
  const suppressAutoScrollRef = useRef(false);
  const hostInitializedRef = useRef(false);

  const minDate = useMemo(() => new Date().toISOString().split('T')[0], []);
  const nameIsValid = nameInput.trim().length >= 2 && nameInput.trim().length <= 50;

  useEffect(() => {
    if (suppressAutoScrollRef.current) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    const hostOrigin = process.env.NEXT_PUBLIC_HOST_APP_ORIGIN || 'http://localhost:3000';
    window.parent.postMessage({ source: 'efacility-chatbot', type: 'chatbot:state', isOpen }, hostOrigin);
  }, [isOpen]);

  useEffect(() => {
    const hostOrigin = process.env.NEXT_PUBLIC_HOST_APP_ORIGIN || 'http://localhost:3000';

    async function handleHostMessage(event: MessageEvent) {
      if (event.origin !== hostOrigin || event.source !== window.parent) return;
      if (event.data?.source !== 'seatbook-host' || event.data?.type !== 'chatbot:init') return;
      const token = String(event.data?.accessToken || '').trim();
      if (!token) return;
      if (hostInitializedRef.current) {
        setAccessToken(token);
        setIsOpen(true);
        return;
      }

      hostInitializedRef.current = true;
      setAccessToken(token);
      setIsOpen(true);
      setShowNameInput(false);
      setIsLoading(true);
      try {
        const session = await createSession();
        setUserName(session.user_name);
        setNameInput(session.user_name);
        setSessionId(session.session_id);
        if (session.initial_response) processResponse(session.initial_response);
      } catch (error) {
        hostInitializedRef.current = false;
        console.error('SeatBook session initialization failed', error);
      } finally {
        setIsLoading(false);
      }
    }

    window.addEventListener('message', handleHostMessage);
    return () => window.removeEventListener('message', handleHostMessage);
  }, []);

  async function startSession(event?: FormEvent) {
    event?.preventDefault();
    if (!nameIsValid || isLoading) return;

    const name = nameInput.trim();
    setUserName(name);
    setIsLoading(true);
    try {
      const session = await createSession();
      setSessionId(session.session_id);
      setShowNameInput(false);
      if (session.initial_response) {
        processResponse(session.initial_response);
      }
    } catch (error) {
      console.error('Session creation failed', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshChat() {
    if (isLoading) return;

    const name = (userName || nameInput).trim();
    resetChatState();
    if (!name) return;

    setUserName(name);
    setNameInput(name);
    setIsLoading(true);
    try {
      const session = await createSession();
      setSessionId(session.session_id);
      setShowNameInput(false);
      if (session.initial_response) {
        processResponse(session.initial_response);
      }
    } catch (error) {
      setShowNameInput(false);
      console.error('Session refresh failed', error);
    } finally {
      setIsLoading(false);
    }
  }

  function resetChatState() {
    suppressAutoScrollRef.current = false;
    setSessionId(null);
    setMessages([]);
    setInputText('');
    setUnreadCount(0);
    setActiveFormCard(null);
    setActiveDropdownKey(null);
    setSelectedSeats([]);
    setSeatHeadcount(1);
    setShowNameInput(false);
  }

  function togglePanel() {
    setIsOpen((open) => {
      const next = !open;
      if (next) setUnreadCount(0);
      return next;
    });
  }

  function addUserMessage(text: string) {
    suppressAutoScrollRef.current = false;
    setMessages((current) => [...current, { from: 'user', userText: text, timestamp: new Date() }]);
  }

  function addBotMessage(message: BotMessage) {
    setMessages((current) => [...current, { from: 'bot', botMessage: message, timestamp: new Date() }]);
  }

  async function dispatchMessage(message: UserMessage) {
    if (!sessionId) return;
    setIsLoading(true);
    try {
      const response = await sendMessage(sessionId, message);
      processResponse(response);
    } catch (error) {
      console.error(error);
      addBotMessage({
        type: 'ERROR',
        text: userFriendlyError(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  function processResponse(response: ChatResponse) {
    if (replaceRebookCalendarRef.current && response.messages.some((message) => message.type === 'REBOOK_CALENDAR')) {
      replaceRebookCalendarRef.current = false;
      setMessages((current) => {
        const lastCalendarIndex = current.findLastIndex((message) => message.botMessage?.type === 'REBOOK_CALENDAR');
        const keepUntil = lastCalendarIndex >= 0 ? lastCalendarIndex : current.length;
        return [
          ...current.slice(0, keepUntil),
          ...response.messages.map((message) => ({ from: 'bot' as const, botMessage: message, timestamp: new Date() })),
        ];
      });
      if (!isOpen) {
        setUnreadCount((count) => count + response.messages.length);
      }
      return;
    }
    if (replaceBookingListRef.current && response.messages.some((message) => message.type === 'BOOKING_LIST')) {
      replaceBookingListRef.current = false;
      setBookingTabLoading(null);
      setMessages((current) => {
        const lastBookingListIndex = current.findLastIndex((message) => message.botMessage?.type === 'BOOKING_LIST');
        const keepUntil = lastBookingListIndex >= 0 ? lastBookingListIndex : current.length;
        return [
          ...current.slice(0, keepUntil),
          ...response.messages.map((message) => ({ from: 'bot' as const, botMessage: message, timestamp: new Date() })),
        ];
      });
      if (!isOpen) {
        setUnreadCount((count) => count + response.messages.length);
      }
      return;
    }
    replaceBookingListRef.current = false;
    replaceRebookCalendarRef.current = false;
    setBookingTabLoading(null);

    response.messages.forEach((message) => {
      addBotMessage(message);
      if (message.type === 'FORM_CARD' && message.form_card) {
        initFormCard(message.form_card);
      }
      if (message.type === 'SEAT_LIST' && message.seat_list) {
        setSeatHeadcount(message.seat_list.headcount || 1);
        setSelectedSeats([]);
      }
    });

    if (!isOpen) {
      setUnreadCount((count) => count + response.messages.length);
    }
  }

  function sendText() {
    const text = inputText.trim();
    if (!text || !sessionId || isLoading) return;
    addUserMessage(text);
    setInputText('');
    setActiveFormCard(null);
    setActiveDropdownKey(null);
    void dispatchMessage({ text, message_type: 'TEXT' });
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendText();
    }
  }

  function selectOption(value: unknown, label: string) {
    if (!sessionId || isLoading) return;
    addUserMessage(label);
    setActiveFormCard(null);
    setActiveDropdownKey(null);
    void dispatchMessage({ text: String(value), message_type: 'TEXT' });
  }

  function selectBookingTab(value: string) {
    if (!sessionId || isLoading) return;
    const mode = value.includes('past') ? 'past' : value.includes('cancelled') ? 'cancelled' : 'upcoming';
    setActiveFormCard(null);
    setActiveDropdownKey(null);
    suppressAutoScrollRef.current = true;
    setBookingTabLoading(mode);
    replaceBookingListRef.current = true;
    void dispatchMessage({
      form_data: { action: 'booking_list_mode', mode },
      message_type: 'FORM_SUBMIT',
    });
  }

  function selectSeat(seat: SeatCard) {
    if (!sessionId || isLoading || seatHeadcount > 1) return;
    addUserMessage(`Selected: ${seat.seat_code}`);
    void dispatchMessage({ form_data: { seat_id: seat.id }, message_type: 'FORM_SUBMIT' });
  }

  function toggleSeat(seat: SeatCard) {
    setSelectedSeats((current) => {
      const exists = current.some((item) => item.id === seat.id);
      if (exists) return current.filter((item) => item.id !== seat.id);
      if (current.length >= seatHeadcount) return current;
      return [...current, seat];
    });
  }

  function submitSelectedSeats() {
    if (!sessionId || isLoading || selectedSeats.length !== seatHeadcount) return;
    addUserMessage(`Selected: ${selectedSeats.map((seat) => seat.seat_code).join(', ')}`);
    const seatIds = selectedSeats.map((seat) => seat.id);
    setSelectedSeats([]);
    void dispatchMessage({ form_data: { seat_ids: seatIds }, message_type: 'FORM_SUBMIT' });
  }

  function cancelBooking(booking: BookingCardData) {
    if (!sessionId || isLoading) return;
    addUserMessage(`Cancel: ${booking.booking_ref}`);
    void dispatchMessage({ form_data: { action: 'cancel', booking_id: booking.booking_id }, message_type: 'FORM_SUBMIT' });
  }

  function modifyBooking(booking: BookingCardData) {
    if (!sessionId || isLoading) return;
    addUserMessage(`Modify: ${booking.booking_ref}`);
    void dispatchMessage({ form_data: { action: 'modify', booking_id: booking.booking_id }, message_type: 'FORM_SUBMIT' });
  }

  function rebookBooking(booking: BookingCardData) {
    if (!sessionId || isLoading) return;
    addUserMessage(`Rebook: ${booking.booking_ref}`);
    void dispatchMessage({ form_data: { action: 'rebook', booking_id: booking.booking_id }, message_type: 'FORM_SUBMIT' });
  }

  function selectRebookDate(bookingId: string, bookingDate: string) {
    if (!sessionId || isLoading) return;
    addUserMessage(`Rebook date: ${formatDate(bookingDate)}`);
    void dispatchMessage({
      form_data: { action: 'rebook_date', booking_id: bookingId, booking_date: bookingDate },
      message_type: 'FORM_SUBMIT',
    });
  }

  function changeRebookMonth(bookingId: string, monthStart?: string | null) {
    if (!sessionId || isLoading || !monthStart) return;
    suppressAutoScrollRef.current = true;
    replaceRebookCalendarRef.current = true;
    void dispatchMessage({
      form_data: { action: 'rebook_month', booking_id: bookingId, month_start: monthStart },
      message_type: 'FORM_SUBMIT',
    });
  }

  function initFormCard(card: FormCard) {
    const nextState: FormCardState = {
      card,
      values: {},
      dropdownOptions: {},
      loading: {},
      errors: {},
    };

    card.fields.forEach((field) => {
      if (field.default_value !== undefined && field.default_value !== null) {
        nextState.values[field.key] = field.default_value;
      } else if (field.field_type === 'date') {
        nextState.values[field.key] = minDate;
      } else if (field.field_type === 'number') {
        nextState.values[field.key] = field.min_value ?? 1;
      } else if (field.field_type === 'checkbox_group') {
        nextState.values[field.key] = [];
      }
    });

    setActiveFormCard(nextState);
    setActiveDropdownKey(null);

    card.fields.forEach((field) => {
      if (field.field_type === 'dropdown_dynamic' && !field.depends_on) {
        void loadDropdownOptions(field, nextState);
      } else if (field.field_type === 'dropdown_dynamic' && field.depends_on && nextState.values[field.depends_on]) {
        void loadDropdownOptions(field, nextState);
      }
    });
  }

  async function loadDropdownOptions(field: FormField, stateOverride?: FormCardState) {
    const state = stateOverride || activeFormCard;
    if (!state) return;

    patchFormState({ loading: { ...state.loading, [field.key]: true } });
    try {
      let options: LookupOption[] | null = null;
      if (field.lookup_endpoint?.includes('sites')) {
        options = await lookupSites();
      } else if (field.lookup_endpoint?.includes('buildings') && state.values.site_id) {
        options = await lookupBuildings(String(state.values.site_id));
      } else if (field.lookup_endpoint?.includes('floors') && state.values.building_id) {
        options = await lookupFloors(String(state.values.building_id));
      } else if (field.lookup_endpoint?.includes('amenities')) {
        options = await lookupAmenities();
      }

      if (options) {
        const shouldAutoSelect = options.length === 1 && !state.values[field.key];
        const autoValue = shouldAutoSelect ? options[0].value : undefined;
        const nextValues = shouldAutoSelect ? { ...state.values, [field.key]: autoValue } : state.values;
        const nextDropdownOptions = { ...state.dropdownOptions, [field.key]: options };
        const nextLoading = { ...state.loading, [field.key]: false };
        setActiveFormCard((current) => {
          if (!current) return current;
          return {
            ...current,
            values: shouldAutoSelect && !current.values[field.key] ? { ...current.values, [field.key]: autoValue } : current.values,
            dropdownOptions: { ...current.dropdownOptions, [field.key]: options },
            loading: { ...current.loading, [field.key]: false },
          };
        });
        if (shouldAutoSelect) {
          state.card.fields.filter((candidate) => candidate.depends_on === field.key).forEach((dependent) => {
            void loadDropdownOptions(dependent, {
              ...state,
              values: nextValues,
              dropdownOptions: nextDropdownOptions,
              loading: nextLoading,
            });
          });
        }
      } else {
        patchFormState({ loading: { ...state.loading, [field.key]: false } });
      }
    } catch {
      setActiveFormCard((current) => current ? { ...current, loading: { ...current.loading, [field.key]: false } } : current);
    }
  }

  function patchFormState(partial: Partial<FormCardState>) {
    setActiveFormCard((current) => current ? { ...current, ...partial } : current);
  }

  function setFieldValue(key: string, value: unknown) {
    setActiveFormCard((current) => {
      if (!current) return current;
      const nextErrors = { ...current.errors };
      delete nextErrors[key];
      return { ...current, values: { ...current.values, [key]: value }, errors: nextErrors };
    });
  }

  function onDropdownChange(field: FormField, value: string) {
    if (!activeFormCard) return;
    const nextValues = { ...activeFormCard.values, [field.key]: value };
    const nextDropdowns = { ...activeFormCard.dropdownOptions };
    const nextErrors = { ...activeFormCard.errors };
    const fieldsToClear = new Set<string>();
    const collectDependents = (parentKey: string) => {
      activeFormCard.card.fields
        .filter((candidate) => candidate.depends_on === parentKey)
        .forEach((dependent) => {
          if (fieldsToClear.has(dependent.key)) return;
          fieldsToClear.add(dependent.key);
          collectDependents(dependent.key);
        });
    };

    collectDependents(field.key);
    delete nextErrors[field.key];
    fieldsToClear.forEach((dependentKey) => {
      nextValues[dependentKey] = '';
      nextDropdowns[dependentKey] = [];
      delete nextErrors[dependentKey];
    });
    setActiveFormCard({ ...activeFormCard, values: nextValues, dropdownOptions: nextDropdowns, errors: nextErrors });
    setActiveDropdownKey(null);

    activeFormCard.card.fields.filter((candidate) => candidate.depends_on === field.key).forEach((dependent) => {
      if (value) {
        void loadDropdownOptions(dependent, { ...activeFormCard, values: nextValues, dropdownOptions: nextDropdowns });
      }
    });
  }

  function onCheckboxChange(key: string, value: string, checked: boolean) {
    if (!activeFormCard) return;
    const current = Array.isArray(activeFormCard.values[key]) ? activeFormCard.values[key] as string[] : [];
    setFieldValue(key, checked ? [...current, value] : current.filter((item) => item !== value));
  }

  function submitFormCard() {
    if (!activeFormCard || !sessionId || isLoading) return;

    const errors: Record<string, string> = {};
    activeFormCard.card.fields.forEach((field) => {
      if (!field.required) return;
      const value = activeFormCard.values[field.key];
      if (!value || (Array.isArray(value) && value.length === 0) || value === '') {
        errors[field.key] = `${field.label} is required`;
      }
    });

    if (Object.keys(errors).length) {
      setActiveFormCard({ ...activeFormCard, errors });
      return;
    }

    const formData = { ...activeFormCard.values };
    const summary = activeFormCard.card.fields
      .map((field) => summarizeField(field, formData[field.key], activeFormCard))
      .filter(Boolean)
      .join('\n');

    addUserMessage(summary);
    setActiveFormCard(null);
    setActiveDropdownKey(null);
    void dispatchMessage({ form_data: formData, message_type: 'FORM_SUBMIT' });
  }

  function summarizeField(field: FormField, value: unknown, state: FormCardState) {
    if (!value || (Array.isArray(value) && value.length === 0)) return '';
    if (field.field_type === 'dropdown_dynamic') {
      const found = (state.dropdownOptions[field.key] || []).find((option) => option.value === value);
      return found ? `${field.label}: ${found.label}` : '';
    }
    if (field.field_type === 'radio') {
      const found = (field.options || []).find((option) => option.value === value);
      return found ? `${field.label}: ${found.label}` : '';
    }
    if (field.field_type === 'checkbox_group') {
      const labels = (value as string[]).map((item) => (field.options || []).find((option) => option.value === item)?.label || item);
      return labels.length ? `${field.label}: ${labels.join(', ')}` : '';
    }
    return `${field.label}: ${String(value)}`;
  }

  return (
    <>
      <section className={`chat-panel ${isOpen ? 'open' : 'closed'}`}>
        <header className="chat-header">
          <div className="chat-header-info">
            <div className="bot-avatar"><AssistantIcon /></div>
            <div>
              <p className="bot-name">eFACiLiTY Assistant</p>
              <p className="bot-status"><span className="status-dot" />{isLoading ? 'Thinking...' : 'Online'} <span className="status-separator">•</span> Seat Booking</p>
            </div>
          </div>
          <div className="header-actions">
            <button className="header-btn" onClick={refreshChat} disabled={isLoading} title="Refresh chat" aria-label="Refresh chat"><RefreshIcon /></button>
            <button className="header-btn" onClick={() => setIsOpen(false)} title="Minimize" aria-label="Minimize"><MinusIcon /></button>
            <button className="header-btn" onClick={togglePanel} title="Close" aria-label="Close"><CloseIcon /></button>
          </div>
        </header>

        <div className="chat-body">
          {showNameInput ? (
            <div className="name-input-screen">
              <div className="welcome-illustration">
                <div className="welcome-icon">Hi</div>
                <h3>Welcome to eFACiLiTY</h3>
                <p>Book your workspace seat in seconds</p>
              </div>
              <form onSubmit={startSession} className="name-form">
                <label className="form-label" htmlFor="user-name">Your name</label>
                <input
                  id="user-name"
                  className="name-input"
                  value={nameInput}
                  onChange={(event) => setNameInput(event.target.value)}
                  placeholder="Enter your name..."
                  autoComplete="off"
                />
                {nameInput && !nameIsValid ? <div className="field-error">Name must be 2-50 characters</div> : null}
                <button type="submit" className="start-btn" disabled={!nameIsValid || isLoading}>
                  {isLoading ? 'Starting...' : 'Start Booking'}
                </button>
              </form>
            </div>
          ) : (
            <>
              <div className={`messages-area ${activeFormCard ? 'has-form' : ''}`}>
                {messages.map((message, index) => (
                  <div key={`${message.timestamp.toISOString()}-${index}`} className={`message-row ${message.from === 'user' ? 'user-row' : ''}`}>
                    {message.from === 'bot' ? <div className="bot-msg-avatar"><AssistantIcon /></div> : null}
                    {message.from === 'bot' && message.botMessage ? (
                      <div className="bot-bubble-wrap">{renderBotMessage(message.botMessage)}</div>
                    ) : null}
                    {message.from === 'user' ? <div className="user-bubble">{message.userText}</div> : null}
                  </div>
                ))}
                {isLoading && !bookingTabLoading ? (
                  <div className="typing-row">
                    <div className="bot-msg-avatar"><AssistantIcon /></div>
                    <div className="typing-dots"><span /><span /><span /></div>
                  </div>
                ) : null}
                <div ref={messagesEndRef} />
              </div>

              {activeFormCard ? renderActiveFormCard(activeFormCard) : null}
            </>
          )}
        </div>

        {!showNameInput ? (
          <footer className="chat-footer">
            <div className="chat-input-bar">
              <input
                className="chat-input"
                value={inputText}
                onChange={(event) => setInputText(event.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="Type your message..."
                disabled={isLoading}
                autoComplete="off"
              />
              <button className="send-btn" onClick={sendText} disabled={!inputText.trim() || isLoading} aria-label="Send message"><SendIcon /></button>
            </div>
            <div className="chat-footer-actions">
              <button className="footer-action-btn" onClick={() => selectOption('0', 'Main Menu')} disabled={!sessionId || isLoading}>
                <HomeIcon /> Main Menu
              </button>
              <button className="footer-action-btn" onClick={refreshChat} disabled={isLoading}>
                <RefreshSmallIcon /> Restart Chat
              </button>
            </div>
          </footer>
        ) : null}
      </section>
    </>
  );

  function renderBotMessage(message: BotMessage): ReactNode {
    if (message.type === 'TEXT') {
      const classes = ['bot-bubble', 'text-bubble'];
      if (message.text?.includes('OK') || message.text?.includes('cancelled')) classes.push('info-bubble');
      if (message.text?.includes('already have') || message.text?.includes('already booked')) classes.push('warning-bubble');
      return (
        <div className={classes.join(' ')}>
          <div dangerouslySetInnerHTML={{ __html: markdownSimple(message.text) }} />
          {isGreetingMessage(message.text) ? <div className="message-time">10:30 AM</div> : null}
        </div>
      );
    }

    if (message.type === 'ERROR') {
      return <div className="bot-bubble error-bubble" dangerouslySetInnerHTML={{ __html: markdownSimple(message.text) }} />;
    }

    if (message.type === 'OPTIONS') {
      if (isMainMenuOptions(message)) {
        return (
          <div className="main-menu-card">
            {(message.options || []).filter((option) => option.number > 0).map((option) => {
              const meta = mainMenuMeta(option.label);
              return (
                <button
                  key={`${option.number}-${String(option.value)}`}
                  className="main-menu-option"
                  onClick={() => selectOption(option.value, option.label)}
                  disabled={isLoading}
                >
                  <span className={`menu-icon ${meta.className}`}>{meta.icon}</span>
                  <span className="menu-copy">
                    <span className="menu-title">{option.label}</span>
                    <span className="menu-desc">{meta.description}</span>
                  </span>
                  <ChevronRightIcon />
                </button>
              );
            })}
          </div>
        );
      }
      return (
        <div className="options-msg">
          {message.text ? <p className="options-prompt">{message.text}</p> : null}
          <div className="options-list">
            {(message.options || []).map((option) => (
              <button
                key={`${option.number}-${String(option.value)}`}
                className={`option-btn ${option.number === 0 ? 'back-btn' : ''}`}
                onClick={() => selectOption(option.value, option.label)}
                disabled={isLoading}
              >
                {option.number > 0 ? <span className="opt-num">{option.number}</span> : null}
                {option.label}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (message.type === 'FORM_CARD') {
      return (
        <div className="form-card-placeholder">
          <FormIcon />
          Fill in the form below
        </div>
      );
    }

    if (message.type === 'SEAT_LIST' && message.seat_list) {
      return (
        <div className="seat-list-msg">
          {message.text ? <p className="seat-list-header">{message.text}</p> : null}
          <div className="seat-list">
            {(message.seat_list.headcount || 1) <= 1 ? (
              message.seat_list.seats.map((seat) => (
                <button key={seat.id} className="seat-card" onClick={() => selectSeat(seat)} disabled={isLoading}>
                  <span className="seat-card-top"><span className="seat-code">{seat.seat_code}</span></span>
                  {seat.seat_neighborhood ? <span className="seat-neighborhood">Pin {seat.seat_neighborhood}</span> : null}
                </button>
              ))
            ) : (
              <>
                {message.seat_list.seats.map((seat) => {
                  const selected = selectedSeats.some((item) => item.id === seat.id);
                  const disabled = isLoading || (!selected && selectedSeats.length >= seatHeadcount);
                  return (
                    <button key={seat.id} className={`seat-card seat-card-multi ${selected ? 'selected' : ''}`} onClick={() => toggleSeat(seat)} disabled={disabled}>
                      <span className="seat-card-top"><span className="seat-check">{selected ? '[x]' : '[ ]'}</span><span className="seat-code">{seat.seat_code}</span></span>
                      {seat.seat_neighborhood ? <span className="seat-neighborhood">Pin {seat.seat_neighborhood}</span> : null}
                    </button>
                  );
                })}
                <div className="seat-select-footer">
                  <span className="seat-select-count">{selectedSeats.length}/{seatHeadcount} selected</span>
                  <button className="seat-confirm-btn" disabled={isLoading || selectedSeats.length !== seatHeadcount} onClick={submitSelectedSeats}>
                    Confirm {seatHeadcount} seats
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      );
    }

    if (message.type === 'BOOKING_LIST' && message.booking_list) {
      const displayedMode = message.booking_list.mode || bookingListMode(message.text);
      const mode = bookingTabLoading || displayedMode;
      const total = message.booking_list.total || message.booking_list.bookings.length;
      return (
        <div className={`booking-board ${bookingTabLoading ? 'is-tab-loading' : ''}`}>
          <div className="booking-tabs">
            <button className={`booking-tab ${mode === 'upcoming' ? 'active' : ''}`} onClick={() => selectBookingTab('my bookings')} disabled={isLoading}>
              Upcoming {mode === 'upcoming' ? `(${total})` : ''}
            </button>
            <button className={`booking-tab ${mode === 'past' ? 'active' : ''}`} onClick={() => selectBookingTab('show past bookings')} disabled={isLoading}>
              Past {mode === 'past' ? `(${total})` : ''}
            </button>
            <button className={`booking-tab ${mode === 'cancelled' ? 'active' : ''}`} onClick={() => selectBookingTab('show cancelled bookings')} disabled={isLoading}>
              Cancelled {mode === 'cancelled' ? `(${total})` : ''}
            </button>
          </div>
          {bookingTabLoading ? (
            <div className="booking-inline-loading" role="status" aria-live="polite">
              <span className="booking-loading-spinner" />
              Loading {bookingTabLabel(bookingTabLoading)}...
            </div>
          ) : null}
          {message.text ? <p className="booking-list-header">{message.text}</p> : null}
          <div className={`booking-list ${bookingTabLoading && bookingTabLoading !== displayedMode ? 'booking-list-dimmed' : ''}`}>
            {message.booking_list.bookings.map((booking) => {
              const isPastBooking = displayedMode === 'past';
              const statusLabel = isPastBooking ? 'Expired' : booking.status || 'Confirmed';
              const statusClass = isPastBooking ? 'expired' : booking.status?.toLowerCase() || 'confirmed';
              const dateTone = bookingDateTone(booking.booking_date);
              return (
                <div key={booking.booking_id} className={`booking-card booking-card-${dateTone}`}>
                  <div className="bk-header">
                    <span className={`bk-date-main bk-date-${dateTone}`}>{formatBookingDateTitle(booking.booking_date)}</span>
                    <span className={`bk-status ${statusClass}`}>{statusLabel}</span>
                  </div>
                  <div className="bk-body">
                    <div className="bk-detail"><span className="bk-icon"><LocationMiniIcon /></span><span>{booking.site_name} <span className="detail-dot">•</span> {booking.building_name}</span></div>
                    <div className="bk-detail"><span className="bk-icon"><SeatMiniIcon /></span><span>{booking.floor_name} <span className="detail-dot">•</span> Seat {booking.seat_code}</span></div>
                  </div>
                  {booking.can_modify !== false || booking.can_cancel !== false || booking.can_rebook ? (
                    <div className="bk-actions">
                      {booking.can_modify !== false ? <button className="bk-btn bk-modify" onClick={() => modifyBooking(booking)} disabled={isLoading}><EditIcon />Modify</button> : null}
                      {booking.can_cancel !== false ? <button className="bk-btn bk-cancel" onClick={() => cancelBooking(booking)} disabled={isLoading}><CloseSmallIcon />Cancel</button> : null}
                      {booking.can_rebook ? <button className="bk-btn bk-rebook" onClick={() => rebookBooking(booking)} disabled={isLoading}>Rebook</button> : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (message.type === 'REBOOK_CALENDAR' && message.rebook_calendar) {
      const calendar = message.rebook_calendar;
      const leadingSlots = calendar.days.length ? new Date(`${calendar.days[0].date}T00:00:00`).getDay() : 0;
      const monthOptions = calendarYearMonths(calendar.month_start);
      return (
        <div className="rebook-card">
          <div className="rebook-title">Rebook Seat</div>
          <div className="rebook-seat">{calendar.seat_code}</div>
          <div className="rebook-meta">
            {calendar.site_name} <span className="detail-dot">•</span> {calendar.building_name} <span className="detail-dot">•</span> {calendar.floor_name}
          </div>
          {message.text ? <p className="rebook-help">{message.text}</p> : null}
          <div className="rebook-legend">
            <span><span className="legend-dot available" /> Same seat available</span>
            <span><span className="legend-dot unavailable" /> Seat unavailable</span>
            <span><span className="legend-dot reserved" /> Change to same seat</span>
            <span><span className="legend-dot reserved-unavailable" /> Change with another seat</span>
          </div>
          <div className="rebook-month-nav">
            <button className="rebook-nav-btn" onClick={() => changeRebookMonth(calendar.booking_id, calendar.previous_month_start)} disabled={isLoading || !calendar.previous_month_start} title="Previous month">
              Prev
            </button>
            <div className="rebook-month">{formatCalendarMonth(calendar.month_start)}</div>
            <button className="rebook-nav-btn" onClick={() => changeRebookMonth(calendar.booking_id, calendar.next_month_start)} disabled={isLoading} title="Next month">
              Next
            </button>
          </div>
          <div className="rebook-year-picker" aria-label="Select month">
            {monthOptions.map((month) => (
              <button
                key={month.value}
                className={`rebook-month-chip ${month.active ? 'active' : ''}`}
                onClick={() => changeRebookMonth(calendar.booking_id, month.value)}
                disabled={isLoading || month.disabled}
                title={month.disabled ? 'Past month' : `Show ${month.label}`}
              >
                {month.shortLabel}
              </button>
            ))}
          </div>
          <div className="rebook-weekdays">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="rebook-calendar-grid">
            {Array.from({ length: leadingSlots }).map((_, index) => <span key={`blank-${index}`} className="rebook-blank" />)}
            {calendar.days.map((day) => {
              const dateState = day.reserved
                ? day.reserved_seat_available ? 'reserved' : 'reserved-unavailable'
                : day.selectable === false ? 'disabled' : day.available ? 'available' : 'unavailable';
              const dateTitle = day.reserved
                ? day.reserved_seat_available ? 'Change your existing booking to this seat' : 'Change your existing booking with another available seat'
                : day.selectable === false ? 'Past date' : day.available ? 'Same seat available' : 'Same seat unavailable';
              const dateStatus = day.reserved
                ? day.reserved_seat_available ? 'Change' : 'Alt'
                : day.selectable === false ? '' : day.available ? 'Open' : 'Busy';
              return (
                <button
                  key={day.date}
                  className={`rebook-date ${dateState}`}
                  onClick={() => selectRebookDate(calendar.booking_id, day.date)}
                  disabled={isLoading || day.selectable === false}
                  title={dateTitle}
                >
                  <span className="rebook-date-number">{formatDayNumber(day.date)}</span>
                  <span className="rebook-date-status">{dateStatus}</span>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (message.type === 'CONFIRMATION' && message.confirmation) {
      const confirmation = message.confirmation;
      return (
        <div className="confirmation-card">
          <div className="conf-title">Booking Summary</div>
          <ConfirmRow label="Date" value={formatDate(confirmation.booking_date)} />
          <ConfirmRow label="Site" value={confirmation.site_name} />
          <ConfirmRow label="Building" value={confirmation.building_name} />
          <ConfirmRow label="Floor" value={confirmation.floor_name} />
          <ConfirmRow label="Seat" value={confirmation.seat_code} />
        </div>
      );
    }

    if (message.type === 'SUCCESS' && message.success) {
      return (
        <div className="success-card">
          <div className="success-icon">OK</div>
          <div className="success-ref">{message.success.booking_ref}</div>
          <div className="success-msg">{message.success.message}</div>
          <div className="success-detail">{message.success.seat_code} - {formatDate(message.success.booking_date)}</div>
        </div>
      );
    }

    if (message.type === 'QUICK_BOOK' && message.quick_book) {
      const quickBook = message.quick_book;
      return (
        <div className="quick-book-card">
          <div className="qb-prompt">{quickBook.prompt}</div>
          <div className="qb-details">
            <QuickBookRow label="Seat" value={quickBook.last_seat_code} />
            <QuickBookRow label="Site" value={quickBook.last_site} />
            <QuickBookRow label="Building" value={quickBook.last_building} />
            <QuickBookRow label="Floor" value={quickBook.last_floor} />
          </div>
          <div className="qb-actions">
            <button className="qb-btn qb-primary" onClick={() => selectOption('default_location', 'Use default location')} disabled={isLoading}>Use default location</button>
            <button className="qb-btn qb-secondary" onClick={() => selectOption('select_location', 'Select another location')} disabled={isLoading}>Select another location</button>
          </div>
        </div>
      );
    }

    return null;
  }

  function renderActiveFormCard(state: FormCardState) {
    return (
      <div className="active-form-card">
        <div className="form-card-header">
          <div className="form-card-title">{state.card.title}</div>
          {state.card.subtitle ? <div className="form-card-subtitle">{state.card.subtitle}</div> : null}
        </div>
        <div className="form-card-body">
          {state.card.fields.map((field) => (
            <div key={field.key} className={`form-field ${state.errors[field.key] ? 'has-error' : ''}`}>
              <label className="field-label">{field.label}{field.required ? <span className="required-star">*</span> : null}</label>
              {renderFormField(field, state)}
              {state.errors[field.key] ? <div className="field-error">{state.errors[field.key]}</div> : null}
            </div>
          ))}
        </div>
        <div className="form-card-footer">
          <button className="submit-btn" onClick={submitFormCard} disabled={isLoading}>{isLoading ? 'Processing...' : state.card.submit_label}</button>
          <button className="back-btn-sm" onClick={() => selectOption('0', 'Main menu')}>Main menu</button>
        </div>
      </div>
    );
  }

  function renderFormField(field: FormField, state: FormCardState) {
    const value = state.values[field.key];

    if (field.field_type === 'date') {
      return <input type="date" className="field-input" min={minDate} value={String(value || '')} onChange={(event) => setFieldValue(field.key, event.target.value)} />;
    }

    if (field.field_type === 'dropdown_dynamic') {
      const options = state.dropdownOptions[field.key] || [];
      const disabled = Boolean(state.loading[field.key] || (!options.length && field.depends_on && !state.values[field.depends_on]));
      const selected = options.find((option) => option.value === value);
      return (
        <div className="select-wrap">
          <button type="button" className={`field-select custom-select-trigger ${!value ? 'placeholder' : ''}`} disabled={disabled} onClick={() => setActiveDropdownKey(activeDropdownKey === field.key ? null : field.key)}>
            <span className="custom-select-label">{state.loading[field.key] ? 'Loading...' : selected?.label || field.placeholder || 'Select...'}</span>
            <span className="custom-select-chevron">v</span>
          </button>
          {activeDropdownKey === field.key ? (
            <div className="custom-select-menu">
              {options.map((option) => (
                <button key={option.value} type="button" className={`custom-select-option ${value === option.value ? 'selected' : ''}`} onClick={() => onDropdownChange(field, option.value)}>
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
          {state.loading[field.key] ? <span className="select-loader">...</span> : null}
        </div>
      );
    }

    if (field.field_type === 'radio') {
      return (
        <div className="radio-grid">
          {(field.options || []).map((option) => (
            <label key={option.value} className={`radio-option ${value === option.value ? 'selected' : ''}`}>
              <input type="radio" name={field.key} value={option.value} checked={value === option.value} onChange={() => setFieldValue(field.key, option.value)} />
              {option.label}
            </label>
          ))}
        </div>
      );
    }

    if (field.field_type === 'number') {
      const current = Number(value || 1);
      const min = field.min_value ?? 1;
      const max = field.max_value ?? 10;
      return (
        <div className="number-stepper">
          <button className="step-btn" onClick={() => setFieldValue(field.key, Math.max(min, current - 1))}>-</button>
          <span className="step-value">{current}</span>
          <button className="step-btn" onClick={() => setFieldValue(field.key, Math.min(max, current + 1))}>+</button>
          <span className="step-hint">max {max}</span>
        </div>
      );
    }

    if (field.field_type === 'checkbox_group') {
      const selected = Array.isArray(value) ? value as string[] : [];
      return (
        <div className="checkbox-grid">
          {(field.options || []).map((option) => (
            <label key={option.value} className={`checkbox-option ${selected.includes(option.value) ? 'selected' : ''}`}>
              <input type="checkbox" checked={selected.includes(option.value)} onChange={(event) => onCheckboxChange(field.key, option.value, event.target.checked)} />
              {option.label}
            </label>
          ))}
          {!field.required ? <div className="optional-label">optional</div> : null}
        </div>
      );
    }

    return <input className="field-input" value={String(value || '')} onChange={(event) => setFieldValue(field.key, event.target.value)} />;
  }
}

function markdownSimple(value?: string) {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

function formatDate(value: string) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatWeekday(value: string) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-IN', { weekday: 'short' });
}

function formatDayNumber(value: string) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric' });
}

function formatCalendarMonth(value: string) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function calendarYearMonths(monthStart: string) {
  const selected = new Date(`${monthStart}T00:00:00`);
  const today = new Date();
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const selectedYear = selected.getFullYear();
  return Array.from({ length: 12 }).map((_, index) => {
    const month = new Date(selectedYear, index, 1);
    return {
      value: `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-01`,
      label: month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
      shortLabel: month.toLocaleDateString('en-IN', { month: 'short' }),
      active: month.getFullYear() === selected.getFullYear() && month.getMonth() === selected.getMonth(),
      disabled: month < currentMonth,
    };
  });
}

function formatBookingDateTitle(value: string) {
  if (!value) return '';
  const date = new Date(value);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const sameDay = (left: Date, right: Date) =>
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate();
  const label = sameDay(date, today) ? 'Today' : sameDay(date, tomorrow) ? 'Tomorrow' : date.toLocaleDateString('en-IN', { weekday: 'short' });
  const formatted = date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `${label} • ${formatted}`;
}

function bookingListMode(text?: string): 'upcoming' | 'past' | 'cancelled' {
  const value = (text || '').toLowerCase();
  if (value.includes('cancelled') || value.includes('canceled')) return 'cancelled';
  if (value.includes('past') || value.includes('history')) return 'past';
  return 'upcoming';
}

function bookingTabLabel(mode: 'upcoming' | 'past' | 'cancelled') {
  if (mode === 'past') return 'past bookings';
  if (mode === 'cancelled') return 'cancelled bookings';
  return 'upcoming bookings';
}

function bookingDateTone(value: string): 'past' | 'today' | 'future' {
  const bookingDate = new Date(`${value.slice(0, 10)}T00:00:00`);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (bookingDate < today) return 'past';
  if (
    bookingDate.getFullYear() === today.getFullYear() &&
    bookingDate.getMonth() === today.getMonth() &&
    bookingDate.getDate() === today.getDate()
  ) {
    return 'today';
  }
  return 'future';
}

function userFriendlyError(error: unknown) {
  const raw = error instanceof Error ? error.message : '';
  if (raw.toLowerCase().includes('session not found') || raw.toLowerCase().includes('expired')) {
    return 'Your chat session has expired. Please use Restart Chat to continue with a fresh session.';
  }
  if (raw) return raw;
  return 'I am having trouble reaching the booking service right now. Please try again in a few minutes, or use Restart Chat.';
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return <div className="conf-row"><span className="conf-label">{label}</span><span className="conf-value">{value}</span></div>;
}

function QuickBookRow({ label, value }: { label: string; value: string }) {
  return <div className="qb-detail-row"><span className="qb-label">{label}</span><span className="qb-value">{value}</span></div>;
}

function isGreetingMessage(value?: string) {
  if (!value) return false;
  return /how can i help/i.test(value) || /hi\s+\w+/i.test(value);
}

function isMainMenuOptions(message: BotMessage) {
  const labels = (message.options || []).map((option) => option.label.toLowerCase());
  return labels.includes('quick book') && labels.includes('book a seat') && labels.includes('my bookings');
}

function mainMenuMeta(label: string): { description: string; className: string; icon: ReactNode } {
  const normalized = label.toLowerCase();
  if (normalized.includes('quick')) {
    return {
      description: 'Use a previous or recommended seat',
      className: 'menu-icon-quick',
      icon: <LightningIcon />,
    };
  }
  if (normalized.includes('book a seat') || normalized.includes('choose')) {
    return {
      description: 'Select location, floor and seat',
      className: 'menu-icon-seat',
      icon: <SeatMenuIcon />,
    };
  }
  return {
    description: 'View, modify or cancel bookings',
    className: 'menu-icon-bookings',
    icon: <CalendarMenuIcon />,
  };
}

function MessageIcon() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
}

function AssistantIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="8" width="14" height="10" rx="5" fill="currentColor" opacity="0.18" />
      <path d="M8 8.5A4 4 0 0 1 12 5a4 4 0 0 1 4 3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <rect x="6" y="9" width="12" height="8" rx="4" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="10" cy="13" r="1" fill="currentColor" />
      <circle cx="14" cy="13" r="1" fill="currentColor" />
      <path d="M12 5V3.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="2.7" r="1" fill="currentColor" />
    </svg>
  );
}

function RefreshIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /></svg>;
}

function RefreshSmallIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3"><path d="M20 6v5h-5" /><path d="M4 18v-5h5" /><path d="M18.5 9A7 7 0 0 0 6.7 6.2L4 8.8" /><path d="M5.5 15A7 7 0 0 0 17.3 17.8L20 15.2" /></svg>;
}

function MinusIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /></svg>;
}

function CloseIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
}

function CloseSmallIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
}

function EditIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
}

function SendIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3.6 20.4 21.5 3.2 14.2 22l-3.6-8.5L2 9.8l19.5-6.6L7.1 11.7l4.2 1.8 1.8 4.1z" /></svg>;
}

function FormIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="9" x2="15" y2="9" /><line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="12" y2="17" /></svg>;
}

function HomeIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M4 10.8 12 4l8 6.8v8.7a.5.5 0 0 1-.5.5h-5v-6h-5v6h-5a.5.5 0 0 1-.5-.5z" /></svg>;
}

function ChevronRightIcon() {
  return <svg className="menu-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="m9 18 6-6-6-6" /></svg>;
}

function LightningIcon() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4.5 13h6L9 22l10.5-13h-6z" /></svg>;
}

function SeatMenuIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 3h10v7.5a2.5 2.5 0 0 1-2.5 2.5h-5A2.5 2.5 0 0 1 7 10.5z" />
      <path d="M5 12h14v2.2A2.8 2.8 0 0 1 16.2 17H7.8A2.8 2.8 0 0 1 5 14.2z" />
      <path d="M7 18h2v3H7zm8 0h2v3h-2z" />
    </svg>
  );
}

function CalendarMenuIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 2h2v3h6V2h2v3h2.5A2.5 2.5 0 0 1 22 7.5v11A2.5 2.5 0 0 1 19.5 21h-15A2.5 2.5 0 0 1 2 18.5v-11A2.5 2.5 0 0 1 4.5 5H7zM4 10v8.5a.5.5 0 0 0 .5.5h15a.5.5 0 0 0 .5-.5V10z" />
      <path d="M7 13h3v3H7zm5 0h3v3h-3z" fill="white" opacity="0.9" />
    </svg>
  );
}

function LocationMiniIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
    </svg>
  );
}

function SeatMiniIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 3h10v7.2a2.8 2.8 0 0 1-2.8 2.8H9.8A2.8 2.8 0 0 1 7 10.2z" />
      <path d="M5 12.5h14v2A2.5 2.5 0 0 1 16.5 17h-9A2.5 2.5 0 0 1 5 14.5zM7 18h2v3H7zm8 0h2v3h-2z" />
    </svg>
  );
}
