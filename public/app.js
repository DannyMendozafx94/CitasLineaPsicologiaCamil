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

const formState = {
  editingPatientId: null,
  editingAppointmentId: null,
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
  const session = await fetchJson('/api/auth/session');
  adminName.textContent = session.user.name;
  adminEmail.textContent = session.user.email;

  const data = await fetchJson('/api/dashboard');
  setCounts(data.resumen);
  renderPatients(data.pacientes);
  renderAppointments(data.citas);
  renderReminders(data.recordatorios);
  fillPatientSelect(data.todosLosPacientes);
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

loadDashboard().catch((error) => {
  if (error.message !== 'Sesion expirada.') {
    setFeedback(error.message, true);
  }
});
