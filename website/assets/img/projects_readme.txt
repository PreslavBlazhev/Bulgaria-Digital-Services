СНИМКИ НА ПРОЕКТИ
=================

Всяка project карта вече използва реален screenshot на живия сайт.

Актуални файлове (обновени 31.07.2026):

  pizza-pazzo.png            Pizza Pazzo — начална страница
  makeup-denitsa.png         Make up by Denitsa — начална страница (нов дизайн)
  elite-vehicle-detail.png   Elite Vehicle Detail — начална страница
  zlatnata-skara.png         Механа Златната Скара
  techdrive-diagnostics.png  TechDrive Diagnostics
  bankov-klima.png           Bankov Klima
  restaurant-ribkata.png     Ресторант Рибката
  dharma-tattoo.png          Dharma Tattoo (демо проект)

Използват се на две места:
  - projects.html  → .project__thumb > img.project__img
  - index.html     → .case__shot > img.case__img (6 featured проекта)

КАК ДА ОБНОВИТЕ SCREENSHOT
--------------------------
1. Пуснете съответния проект локално (или отворете живия сайт).
2. Направете screenshot на началната страница при ширина ~1900px,
   височина ~880px. Пример с headless Chrome:

   chrome.exe --headless=new --hide-scrollbars --window-size=1900,880 ^
     --screenshot="pizza-pazzo.png" --virtual-time-budget=10000 http://localhost:3000/

3. Запишете файла тук със същото име — нищо в HTML-а не се променя.

Забележка: снимките се показват с object-fit: cover и object-position: top center,
затова горната част на екрана (hero секцията) е тази, която се вижда в картата.

ПРИ ДОБАВЯНЕ НА НОВ ПРОЕКТ
--------------------------
1. Сложете screenshot тук.
2. Добавете <article class="project"> в projects.html със съответното data-cat
   (restaurant | beauty | auto | service | creative).
   Ако категорията е нова — добавете и бутон .filter-btn с това data-filter.
3. По желание добавете и <article class="case"> в index.html (featured секция).

Логото Bulgaria Digital Services е в assets/img/favicon.svg (векторно, мащабируемо).
Social preview изображението е assets/img/og-image.svg.
