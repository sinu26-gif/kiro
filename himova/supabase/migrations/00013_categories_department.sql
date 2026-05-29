-- Himova 00013: shopkeeper category + product department
alter table public.shopkeepers add column if not exists shop_category text not null default 'both';
alter table public.shopkeepers drop constraint if exists shopkeepers_shop_category_check;
alter table public.shopkeepers add constraint shopkeepers_shop_category_check check (shop_category in ('shoes','clothing','both'));
alter table public.categories add column if not exists department text not null default 'other';
alter table public.categories drop constraint if exists categories_department_check;
alter table public.categories add constraint categories_department_check check (department in ('shoes','clothing','other'));
update public.categories set department='shoes' where slug in ('shoes','sneakers','boots','sports');
update public.categories set department='clothing' where slug in ('clothing');
update public.categories set department='other' where slug in ('accessories');
