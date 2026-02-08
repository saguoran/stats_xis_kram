import json
import shutil
from playwright.sync_api import sync_playwright
import os
os.chdir(r"C:\Users\frees\Downloads\tensorflow_jupyterlab\mark_six\marksix_data")
FILE_PATHS = {
    "latest": r'latest.json',
    "-1": r'latest-1.json',
    "top100": r'top100.json',
}
def scrape_mark_six():
    with sync_playwright() as p:
        # Launch browser (headless=True is faster, False lets you watch it)
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Navigating to HKJC Mark Six Results...")
        url = "https://bet.hkjc.com/en/marksix/results"
        page.goto(url)
        # 1. Wait for the main container to exist and be visible
        page.wait_for_selector(".marksix-results-table-container", state="visible", timeout=10000)

        # 2. Define the locators
        first_row = page.locator(".table-row").first
        cell_locator = first_row.locator(".table-cell")

        # 3. THE FIX: Wait for at least one cell to be attached/visible
        # This ensures that cells[0] will actually exist when we call .all()
        cell_locator.first.wait_for(state="visible", timeout=10000)

        # 4. Now safely get the list
        cells = cell_locator.all()

        # 5. Extract data (this will no longer throw IndexError)
        draw_id = cells[0].locator("a").inner_text()
        draw_date = cells[1].inner_text()
        draw_sb_name = cells[2].inner_text()

        # For the numbers, use a locator inside the specific cell (index 3)
        # This looks for all images inside the 'img-box' within the 4th cell
        draw_numbers = [img.get_attribute("alt") for img in cells[3].locator(".img-box img").all()]

        latest_result = {
            "id": draw_id,
            "date": draw_date,
            "sbnameE": draw_sb_name,
            "no": draw_numbers[:-1],
            "sno": draw_numbers[-1]
        }
        print(latest_result)
        data = []

        has_update = False
        with open(FILE_PATHS['latest'], 'r', encoding='utf-8') as f:
            data: list = json.load(f)
            if data[0]['id'] !=  draw_id:
                has_update = True
                data.insert(0,latest_result)

        if has_update:
            shutil.copyfile(FILE_PATHS['latest'], FILE_PATHS['-1'])
            with open(FILE_PATHS['latest'], 'w', encoding='utf-8') as f:
                json.dump(data,f , ensure_ascii=False, indent=4)
        browser.close()
        return has_update
    # TODO
# the most and lest frequent 25 sno
# in 2 years, a year, half year, a season, a month
def take_top_100():
    with open(FILE_PATHS['latest'], 'r', encoding='utf-8') as f:
        data: list = json.load(f)[:100]

        with open(FILE_PATHS['top100'], 'w', encoding='utf-8') as f:
            json.dump(data,f , ensure_ascii=False, indent=4)
            



def check_data():
    with open(FILE_PATHS['latest'], 'r', encoding='utf-8') as f:
        data: list = json.load(f)
        ids = set()
        last_id = None
        for entry in data:
            if entry['id'] in ids:
                print(f"Duplicate ID found: {entry['id']}")
            else:
                ids.add(entry['id'])
            year,year_id = [int(x) for x in entry['id'].split('/')]
            if last_id:
                if year == last_id[0] and  year_id != last_id[1]-1:
                    print(f"Missing id between {f'{year}/{year_id+1}'}")
            last_id = [year,year_id]
            
    print("Data check complete.")

if __name__ == "__main__":
    has_update = scrape_mark_six()
    if has_update:
        take_top_100()
    # check_data()
