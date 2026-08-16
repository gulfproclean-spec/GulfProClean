create table if not exists pricing_tiers (
  id serial primary key,
  page text not null check (page in ('residential','commercial')),
  band_order int not null,
  band_label text not null,
  max_sqft int,
  essential numeric,
  preferred numeric,
  premium numeric,
  unavailable boolean not null default false,
  unique (page, band_order)
);

insert into pricing_tiers (page, band_order, band_label, max_sqft, essential, preferred, premium, unavailable) values
('residential', 1, 'Up to 1,000 sq ft', 1000, 165, 200, 285, false),
('residential', 2, '1,001–1,500 sq ft', 1500, 205, 250, 360, false),
('residential', 3, '1,501–2,000 sq ft', 2000, 240, 295, 425, false),
('residential', 4, '2,001–2,500 sq ft', 2500, 280, 345, 495, false),
('residential', 5, '2,501–3,000 sq ft', 3000, 315, 390, 560, false),
('residential', 6, '3,001–3,500 sq ft', 3500, 355, 440, 635, false),
('residential', 7, '3,501–4,000 sq ft', 4000, 390, 485, 700, false),
('residential', 8, '4,001–5,000 sq ft', 5000, 455, 565, 815, false),
('residential', 9, '5,001+ sq ft', null, null, null, null, true),
('commercial', 1, '1× Weekly', null, 175, 225, 325, false),
('commercial', 2, '2× Weekly', null, 161, 207, 299, false),
('commercial', 3, '3× Weekly', null, 154, 198, 286, false),
('commercial', 4, '5× Weekly', null, 144, 185, 267, false)
on conflict (page, band_order) do nothing;
