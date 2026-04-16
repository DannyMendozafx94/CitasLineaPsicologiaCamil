const patientForm = document.getElementById('patientForm');
const appointmentForm = document.getElementById('appointmentForm');
const patientSelect = document.getElementById('patientSelect');
const refreshButton = document.getElementById('refreshButton');
const logoutButton = document.getElementById('logoutButton');
const patientFormTitle = document.getElementById('patientFormTitle');
const appointmentFormTitle = document.getElementById('appointmentFormTitle');
const patientSubmitButton = document.getElementById('patientSubmitButton');
const appointmentSubmitButton = document.getElementById('appointmentSubmitButton');
const patientCancelButton = document.getElementById('patientCancelButton');
const appointmentCancelButton = document.getElementById('appointmentCancelButton');
const feedback = document.getElementById('feedback');
const adminName = document.getElementById('adminName');
const adminEmail = document.getElementById('adminEmail');
const calendarPrevButton = document.getElementById('calendarPrevButton');
const calendarNextButton = document.getElementById('calendarNextButton');
const calendarMonthLabel = document.getElementById('calendarMonthLabel');
const calendarGrid = document.getElementById('calendarGrid');
const selectedDateLabel = document.getElementById('selectedDateLabel');
const selectedDateSummary = document.getElementById('selectedDateSummary');
const selectedDateAppointments = document.getElementById('selectedDateAppointments');

const formState = {
  editingPatientId: null,
  editingAppointmentId: null,
};

const calendarState = {
  month: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  selectedDateKey: '',
  appointments: [],
};

const formatDateTime = (value) => {
  return new Date(value).toLocaleString('es-EC', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const setFeedback = (message, isError = false) => {
  feedback.textContent = message;
  feedback.style.background = isError
    ? 'rgba(127, 24, 35, 0.92)'
    : 'rgba(44, 34, 29, 0.92)';
  feedback.classList.add('is-visible');

  window.clearTimeout(setFeedback.timerId);
  setFeedback.timerId = window.setTimeout(() => {
    feedback.classList.remove('is-visible');
  }, 3200);
};

const setCounts = (summary) => {
  document.getElementById('patientsCount').textContent = summary.totalPacientes;
  document.getElementById('appointmentsCount').textContent =
    summary.totalCitasFuturas;
  document.getElementById('scheduledRemindersCount').textContent =
    summary.totalRecordatoriosProgramados;
  document.getElementById('sentRemindersCount').textContent =
    summary.totalRecordatoriosEnviados;
};

const createBadge = (text, type = 'neutral') => {
  const span = document.createElement('span');
  span.className = `badge badge-${type}`;
  span.textContent = text;
  return span;
};

const createDeleteButton = (label, onClick) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'danger-button';
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
};

const createSecondaryActionButton = (label, onClick) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'secondary-button secondary-button-inline';
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
};

const toDatetimeLocalValue = (value) => {
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const capitalize = (text) => {
  if (!text) {
    return '';
  }

  return text.charAt(0).toUpperCase() + text.slice(1);
};

const toDateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateKey = (value) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const formatDateLabel = (value) => {
  return capitalize(
    parseDateKey(value).toLocaleDateString('es-EC', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  );
};

const formatTime = (value) => {
  return new Date(value).toLocaleTimeString('es-EC', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getAppointmentsForDate = (dateKey) => {
  return calendarState.appointments
    .filter((appointment) => toDateKey(appointment.fechaHora) === dateKey)
    .sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora));
};

const syncSelectedDate = () => {
  const year = calendarState.month.getFullYear();
  const month = calendarState.month.getMonth();
  const today = new Date();
  const monthAppointments = calendarState.appointments.filter((appointment) => {
    const appointmentDate = new Date(appointment.fechaHora);
    return (
      appointmentDate.getFullYear() === year && appointmentDate.getMonth() === month
    );
  });
  const appointmentKeys = [
    ...new Set(monthAppointments.map((item) => toDateKey(item.fechaHora))),
  ];
  const selectedDate = calendarState.selectedDateKey
    ? parseDateKey(calendarState.selectedDateKey)
    : null;
  const selectedMatchesMonth =
    selectedDate &&
    selectedDate.getFullYear() === year &&
    selectedDate.getMonth() === month;

  if (selectedMatchesMonth) {
    return;
  }

  if (today.getFullYear() === year && today.getMonth() === month) {
    calendarState.selectedDateKey = toDateKey(today);
    return;
  }

  if (appointmentKeys.length) {
    [calendarState.selectedDateKey] = appointmentKeys;
    return;
  }

  calendarState.selectedDateKey = toDateKey(new Date(year, month, 1));
};

const resetPatientFormState = () => {
  formState.editingPatientId = null;
  patientForm.reset();
  patientFormTitle.textContent = 'Nuevo paciente';
  patientSubmitButton.textContent = 'Guardar paciente';
  patientCancelButton.classList.add('is-hidden');
};

const resetAppointmentFormState = () => {
  formState.editingAppointmentId = null;
  appointmentForm.reset();
  appointmentFormTitle.textContent = 'Programar cita';
  appointmentSubmitButton.textContent = 'Crear cita';
  appointmentCancelButton.classList.add('is-hidden');
};

const startPatientEdit = (patient) => {
  formState.editingPatientId = patient.id;
  patientFormTitle.textContent = 'Editar paciente';
  patientSubmitButton.textContent = 'Guardar cambios';
  patientCancelButton.classList.remove('is-hidden');
  patientForm.elements.nombreCompleto.value = patient.nombreCompleto || '';
  patientForm.elements.telefono.value = patient.telefono || '';
  patientForm.elements.email.value = patient.email || '';
  patientForm.elements.fechaNacimiento.value = patient.fechaNacimiento || '';
  patientForm.elements.motivoConsulta.value = patient.motivoConsulta || '';
  patientForm.elements.notas.value = patient.notas || '';
  patientForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const startAppointmentEdit = (appointment) => {
  formState.editingAppointmentId = appointment.id;
  appointmentFormTitle.textContent = 'Editar cita';
  appointmentSubmitButton.textContent = 'Guardar cambios';
  appointmentCancelButton.classList.remove('is-hidden');
  appointmentForm.elements.pacienteId.value = appointment.pacienteId || '';
  appointmentForm.elements.fechaHora.value = toDatetimeLocalValue(appointment.fechaHora);
  appointmentForm.elements.modalidad.value = appointment.modalidad || 'Presencial';
  appointmentForm.elements.motivo.value = appointment.motivo || '';
  appointmentForm.elements.notas.value = appointment.notas || '';
  appointmentForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const deletePaciente = async (patient) => {
  const confirmed = window.confirm(
    `Se eliminara el paciente ${patient.nombreCompleto} y tambien sus citas y recordatorios.`
  );

  if (!confirmed) {
    return;
  }

  await fetchJson(`/api/pacientes/${patient.id}`, {
    method: 'DELETE',
  });

  await loadDashboard();
  setFeedback('Paciente eliminado correctamente.');
};

const deleteCita = async (appointment) => {
  const confirmed = window.confirm(
    `Se eliminara la cita de ${appointment.pacienteNombre}.`
  );

  if (!confirmed) {
    return;
  }

  await fetchJson(`/api/citas/${appointment.id}`, {
    method: 'DELETE',
  });

  await loadDashboard();
  setFeedback('Cita eliminada correctamente.');
};

const renderPatients = (patients) => {
  const container = document.getElementById('patientsList');

  if (!patients.length) {
    container.className = 'stack-list empty-state';
    container.textContent = 'Aun no hay pacientes.';
    return;
  }

  container.className = 'stack-list';
  container.innerHTML = '';

  patients.forEach((patient) => {
    const card = document.createElement('article');
    card.className = 'stack-card';
    card.innerHTML = `
      <h3>${patient.nombreCompleto}</h3>
      <p>Telefono: ${patient.telefono || 'No registrado'}</p>
      <p>Correo: ${patient.email || 'No registrado'}</p>
      <p>Motivo: ${patient.motivoConsulta || 'Sin especificar'}</p>
    `;
    const actions = document.createElement('div');
    actions.className = 'badge-row';
    actions.appendChild(
      createSecondaryActionButton('Editar paciente', () => startPatientEdit(patient))
    );
    actions.appendChild(
      createDeleteButton('Eliminar paciente', async () => {
        try {
          await deletePaciente(patient);
        } catch (error) {
          setFeedback(error.message, true);
        }
      })
    );
    card.appendChild(actions);
    container.appendChild(card);
  });
};

const renderAppointments = (appointments) => {
  const container = document.getElementById('appointmentsList');

  if (!appointments.length) {
    container.className = 'stack-list empty-state';
    container.textContent = 'Aun no hay citas agendadas.';
    return;
  }

  container.className = 'stack-list';
  container.innerHTML = '';

  appointments.forEach((appointment) => {
    const card = document.createElement('article');
    card.className = 'stack-card';
    card.innerHTML = `
      <h3>${appointment.pacienteNombre}</h3>
      <p>${formatDateTime(appointment.fechaHora)}</p>
      <p>Modalidad: ${appointment.modalidad}</p>
      <p>Tema: ${appointment.motivo || 'Seguimiento general'}</p>
    `;

    const badgeRow = document.createElement('div');
    badgeRow.className = 'badge-row';
    badgeRow.appendChild(createBadge('Cita futura', 'success'));
    badgeRow.appendChild(
      createBadge(`${appointment.recordatorios.length} recordatorios`, 'neutral')
    );
    badgeRow.appendChild(
      createSecondaryActionButton('Editar cita', () => startAppointmentEdit(appointment))
    );
    badgeRow.appendChild(
      createDeleteButton('Eliminar cita', async () => {
        try {
          await deleteCita(appointment);
        } catch (error) {
          setFeedback(error.message, true);
        }
      })
    );
    card.appendChild(badgeRow);
    container.appendChild(card);
  });
};

const getReminderBadgeType = (status) => {
  return status === 'enviado' ? 'success' : 'neutral';
};

const renderReminders = (reminders) => {
  const container = document.getElementById('remindersList');

  if (!reminders.length) {
    container.className = 'stack-list empty-state';
    container.textContent = 'Aun no hay recordatorios programados.';
    return;
  }

  container.className = 'stack-list';
  container.innerHTML = '';

  reminders.forEach((reminder) => {
    const card = document.createElement('article');
    card.className = 'stack-card';
    card.innerHTML = `
      <h3>${reminder.pacienteNombre}</h3>
      <p>${reminder.mensaje}</p>
      <p>Programado para: ${formatDateTime(reminder.programadoPara)}</p>
    `;

    const badgeRow = document.createElement('div');
    badgeRow.className = 'badge-row';
    badgeRow.appendChild(createBadge(reminder.tipo, 'neutral'));
    badgeRow.appendChild(
      createBadge(reminder.estado, getReminderBadgeType(reminder.estado))
    );
    card.appendChild(badgeRow);
    container.appendChild(card);
  });
};

const renderSelectedDateAppointments = () => {
  const appointments = getAppointmentsForDate(calendarState.selectedDateKey);
  selectedDateLabel.textContent = formatDateLabel(calendarState.selectedDateKey);

  if (!appointments.length) {
    selectedDateSummary.textContent = 'No hay citas registradas para este dia.';
    selectedDateAppointments.className = 'stack-list empty-state';
    selectedDateAppointments.textContent =
      'Este dia esta disponible para nuevos agendamientos.';
    return;
  }

  const totalText =
    appointments.length === 1 ? '1 cita programada' : `${appointments.length} citas programadas`;
  selectedDateSummary.textContent = `${totalText} para esta fecha.`;
  selectedDateAppointments.className = 'stack-list';
  selectedDateAppointments.innerHTML = '';

  appointments.forEach((appointment) => {
    const card = document.createElement('article');
    card.className = 'stack-card calendar-appointment-card';
    card.innerHTML = `
      <h3>${formatTime(appointment.fechaHora)} - ${appointment.pacienteNombre}</h3>
      <p>Modalidad: ${appointment.modalidad}</p>
      <p>Motivo: ${appointment.motivo || 'Seguimiento general'}</p>
    `;

    const badgeRow = document.createElement('div');
    badgeRow.className = 'badge-row';
    badgeRow.appendChild(
      createBadge(`${appointment.recordatorios.length} recordatorios`, 'neutral')
    );
    card.appendChild(badgeRow);
    selectedDateAppointments.appendChild(card);
  });
};

const renderCalendar = () => {
  syncSelectedDate();

  const year = calendarState.month.getFullYear();
  const month = calendarState.month.getMonth();
  const firstDay = new Date(year, month, 1);
  const totalDays = new Date(year, month + 1, 0).getDate();
  const leadingEmptyDays = (firstDay.getDay() + 6) % 7;
  const todayKey = toDateKey(new Date());

  calendarMonthLabel.textContent = capitalize(
    calendarState.month.toLocaleDateString('es-EC', {
      month: 'long',
      year: 'numeric',
    })
  );

  calendarGrid.innerHTML = '';

  for (let index = 0; index < leadingEmptyDays; index += 1) {
    const emptyCell = document.createElement('span');
    emptyCell.className = 'calendar-day calendar-day-empty';
    emptyCell.setAttribute('aria-hidden', 'true');
    calendarGrid.appendChild(emptyCell);
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(year, month, day);
    const dateKey = toDateKey(date);
    const appointments = getAppointmentsForDate(dateKey);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'calendar-day';

    if (appointments.length) {
      button.classList.add('calendar-day-busy');
    } else {
      button.classList.add('calendar-day-free');
    }

    if (dateKey === todayKey) {
      button.classList.add('calendar-day-today');
    }

    if (dateKey === calendarState.selectedDateKey) {
      button.classList.add('calendar-day-selected');
    }

    button.innerHTML = `
      <span class="calendar-day-number">${day}</span>
      <span class="calendar-day-meta">
        ${appointments.length ? `${appointments.length} cita${appointments.length > 1 ? 's' : ''}` : 'Libre'}
      </span>
    `;
    button.addEventListener('click', () => {
      calendarState.selectedDateKey = dateKey;
      renderCalendar();
    });
    calendarGrid.appendChild(button);
  }

  renderSelectedDateAppointments();
};

const fillPatientSelect = (patients) => {
  patientSelect.innerHTML = '<option value="">Selecciona un paciente</option>';

  patients.forEach((patient) => {
    const option = document.createElement('option');
    option.value = patient.id;
    option.textContent = patient.nombreCompleto;
    patientSelect.appendChild(option);
  });
};

const fetchJson = async (url, options) => {
  const response = await fetch(url, options);
  let data = {};

  try {
    data = await response.json();
  } catch (error) {
    data = {};
  }

  if (response.status === 401) {
    window.location.href = '/login';
    throw new Error('Sesion expirada.');
  }

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo completar la solicitud.');
  }

  return data;
};

const loadDashboard = async () => {
  const [session, data, appointments] = await Promise.all([
    fetchJson('/api/auth/session'),
    fetchJson('/api/dashboard'),
    fetchJson('/api/citas'),
  ]);

  adminName.textContent = session.user.name;
  adminEmail.textContent = session.user.email;
  setCounts(data.resumen);
  renderPatients(data.pacientes);
  renderAppointments(data.citas);
  renderReminders(data.recordatorios);
  fillPatientSelect(data.todosLosPacientes);
  calendarState.appointments = appointments;
  renderCalendar();
};

patientForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(patientForm);
  const payload = Object.fromEntries(formData.entries());
  const wasEditing = Boolean(formState.editingPatientId);

  try {
    await fetchJson(
      wasEditing ? `/api/pacientes/${formState.editingPatientId}` : '/api/pacientes',
      {
        method: wasEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    resetPatientFormState();
    await loadDashboard();
    setFeedback(
      wasEditing ? 'Paciente actualizado correctamente.' : 'Paciente guardado correctamente.'
    );
  } catch (error) {
    setFeedback(error.message, true);
  }
});

appointmentForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(appointmentForm);
  const payload = Object.fromEntries(formData.entries());

  try {
    await fetchJson(
      formState.editingAppointmentId
        ? `/api/citas/${formState.editingAppointmentId}`
        : '/api/citas',
      {
        method: formState.editingAppointmentId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    const wasEditing = Boolean(formState.editingAppointmentId);
    resetAppointmentFormState();
    await loadDashboard();
    setFeedback(
      wasEditing
        ? 'Cita actualizada y recordatorios regenerados.'
        : 'Cita creada y recordatorios programados.'
    );
  } catch (error) {
    setFeedback(error.message, true);
  }
});

patientCancelButton.addEventListener('click', () => {
  resetPatientFormState();
});

appointmentCancelButton.addEventListener('click', () => {
  resetAppointmentFormState();
});

refreshButton.addEventListener('click', async () => {
  try {
    await loadDashboard();
    setFeedback('Datos actualizados.');
  } catch (error) {
    setFeedback(error.message, true);
  }
});

logoutButton.addEventListener('click', async () => {
  try {
    await fetchJson('/api/auth/logout', {
      method: 'POST',
    });

    window.location.href = '/login';
  } catch (error) {
    setFeedback(error.message, true);
  }
});

calendarPrevButton.addEventListener('click', () => {
  calendarState.month = new Date(
    calendarState.month.getFullYear(),
    calendarState.month.getMonth() - 1,
    1
  );
  calendarState.selectedDateKey = '';
  renderCalendar();
});

calendarNextButton.addEventListener('click', () => {
  calendarState.month = new Date(
    calendarState.month.getFullYear(),
    calendarState.month.getMonth() + 1,
    1
  );
  calendarState.selectedDateKey = '';
  renderCalendar();
});

loadDashboard().catch((error) => {
  if (error.message !== 'Sesion expirada.') {
    setFeedback(error.message, true);
  }
});
