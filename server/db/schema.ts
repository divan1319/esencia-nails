import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  smallint,
  boolean,
  date,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

// Convenciones:
// - Dinero en centavos (integer). $12.50 -> 1250
// - Horas como minutos desde medianoche, hora local de El Salvador. 16:30 -> 990
// - weekday: 0 = domingo ... 6 = sábado (igual que Date#getDay)

export const priceType = pgEnum('price_type', ['fixed', 'from', 'quote'])
export const availabilityMode = pgEnum('availability_mode', ['auto', 'on_request'])
export const depositMode = pgEnum('deposit_mode', ['none', 'fixed', 'percent'])
export const depositStatus = pgEnum('deposit_status', ['not_required', 'pending', 'received'])
export const templateKind = pgEnum('template_kind', [
  'confirmation',
  'rejection',
  'reschedule',
  'cancellation',
  'deposit',
  'reminder',
  'other',
])
export const bookingStatus = pgEnum('booking_status', [
  'pending',
  'confirmed',
  'rejected',
  'cancelled',
  'completed',
])

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}

// Una sola fila (id = 1). Se crea en el seed y luego solo se actualiza.
export const settings = pgTable('settings', {
  id: integer('id').primaryKey().default(1),

  // Contenido del inicio
  businessName: text('business_name').notNull(),
  tagline: text('tagline'),
  heroText: text('hero_text'),
  whatsapp: text('whatsapp'),
  instagramUrl: text('instagram_url'),
  paymentMethodsText: text('payment_methods_text'),

  // Reglas de reserva
  slotStepMinutes: integer('slot_step_minutes').notNull().default(30),
  travelBufferMinutes: integer('travel_buffer_minutes').notNull().default(0),
  minNoticeHours: integer('min_notice_hours').notNull().default(12),
  maxDaysAhead: integer('max_days_ahead').notNull().default(30),
  pendingBlocksSlot: boolean('pending_blocks_slot').notNull().default(true),

  // Traslado
  chargeTravelFee: boolean('charge_travel_fee').notNull().default(false),

  // Anticipo: depositValue es centavos si mode = fixed, porcentaje (0-100) si mode = percent
  depositMode: depositMode('deposit_mode').notNull().default('none'),
  depositValue: integer('deposit_value').notNull().default(0),
  depositInstructions: text('deposit_instructions'),

  updatedAt: timestamps.updatedAt,
})

export const services = pgTable('services', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  priceType: priceType('price_type').notNull().default('from'),
  priceCents: integer('price_cents'), // null cuando priceType = 'quote'
  durationMinutes: integer('duration_minutes').notNull(),
  active: boolean('active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  ...timestamps,
})

export const zones = pgTable('zones', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  travelFeeCents: integer('travel_fee_cents').notNull().default(0),
  active: boolean('active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const galleryCategories = pgTable(
  'gallery_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [uniqueIndex('gallery_categories_slug_idx').on(t.slug)],
)

export const galleryItems = pgTable(
  'gallery_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    categoryId: uuid('category_id').references(() => galleryCategories.id, {
      onDelete: 'set null',
    }),
    thumbKey: text('thumb_key').notNull(), // WebP/JPEG de 600 px en S3_BUCKET
    fullKey: text('full_key').notNull(), // WebP/JPEG de 1600 px en S3_BUCKET
    width: integer('width').notNull(), // de la versión completa
    height: integer('height').notNull(),
    alt: text('alt'),
    featured: boolean('featured').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamps.createdAt,
  },
  (t) => [index('gallery_items_category_idx').on(t.categoryId)],
)

// Varias filas por día permitidas (ej. mañana y tarde).
export const availabilityRules = pgTable(
  'availability_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    weekday: smallint('weekday').notNull(),
    startMinute: integer('start_minute').notNull(),
    endMinute: integer('end_minute').notNull(),
    mode: availabilityMode('mode').notNull().default('auto'),
  },
  (t) => [index('availability_rules_weekday_idx').on(t.weekday)],
)

// startMinute/endMinute null = día completo bloqueado.
export const blockedDates = pgTable(
  'blocked_dates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    date: date('date', { mode: 'string' }).notNull(),
    startMinute: integer('start_minute'),
    endMinute: integer('end_minute'),
    reason: text('reason'),
  },
  (t) => [index('blocked_dates_date_idx').on(t.date)],
)

export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull(), // código corto para que la clienta consulte su reserva

    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'restrict' }),
    zoneId: uuid('zone_id').references(() => zones.id, { onDelete: 'set null' }),

    date: date('date', { mode: 'string' }).notNull(),
    startMinute: integer('start_minute').notNull(),
    endMinute: integer('end_minute').notNull(),
    status: bookingStatus('status').notNull().default('pending'),

    clientName: text('client_name').notNull(),
    clientPhone: text('client_phone').notNull(),
    address: text('address'),
    notes: text('notes'),

    // Copia de los valores vigentes al crear la reserva
    serviceNameSnapshot: text('service_name_snapshot').notNull(),
    priceTypeSnapshot: priceType('price_type_snapshot').notNull(),
    priceCentsSnapshot: integer('price_cents_snapshot'),
    travelFeeCentsSnapshot: integer('travel_fee_cents_snapshot').notNull().default(0),
    depositCentsSnapshot: integer('deposit_cents_snapshot').notNull().default(0),
    depositStatus: depositStatus('deposit_status').notNull().default('not_required'),

    adminNotes: text('admin_notes'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('bookings_code_idx').on(t.code),
    index('bookings_date_status_idx').on(t.date, t.status),
    index('bookings_phone_status_idx').on(t.clientPhone, t.status),
  ],
)

// Plantillas que ella crea; {{variable}} se reemplaza al enviar
export const whatsappTemplates = pgTable(
  'whatsapp_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    kind: templateKind('kind').notNull(),
    body: text('body').notNull(),
    active: boolean('active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
  },
  (t) => [index('whatsapp_templates_kind_idx').on(t.kind)],
)

// Solo para el rate limit del formulario público
export const bookingAttempts = pgTable(
  'booking_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ip: text('ip').notNull(),
    phone: text('phone').notNull(),
    createdAt: timestamps.createdAt,
  },
  (t) => [index('booking_attempts_ip_created_idx').on(t.ip, t.createdAt)],
)

export type Settings = typeof settings.$inferSelect
export type Booking = typeof bookings.$inferSelect
export type AvailabilityRule = typeof availabilityRules.$inferSelect
export type BlockedDate = typeof blockedDates.$inferSelect
export type BookingStatus = (typeof bookingStatus.enumValues)[number]
export type TemplateKind = (typeof templateKind.enumValues)[number]
