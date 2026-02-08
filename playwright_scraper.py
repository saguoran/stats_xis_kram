import asyncio
import json
import shutil
from playwright.async_api import async_playwright
import os
os.chdir("marksix_data")
FILE_PATHS = {
    "latest": r'latest.json',
    "-1": r'latest-1.json',
    "top100": r'top100.json',
}
async def scrape_mark_six():
   async with async_playwright() as p: 
        browser = await p.chromium.launch(headless=True)
        # 1. Create a context with a real user agent
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        print("Navigating to HKJC...")
        url = "https://bet.hkjc.com/en/marksix/results"
        
        try:
            # 2. Faster wait strategy + longer timeout
            await page.goto(url, wait_until="domcontentloaded", timeout=60000)
            
            # 3. Specifically wait for the table container to appear
            await page.wait_for_selector(".marksix-results-table-container", timeout=20000)
        
            first_row = page.locator(".table-row").first
            cell_locator = first_row.locator(".table-cell")

            # 4. ADD 'await' to wait_for and all()
            await cell_locator.first.wait_for(state="visible", timeout=10000)
            cells = await cell_locator.all()

            # 5. ADD 'await' to inner_text() and other data calls
            draw_id = await cells[0].locator("a").inner_text()
            draw_date = await cells[1].inner_text()
            draw_sb_name = await cells[2].inner_text()

            # Use await inside the list comprehension too
            draw_numbers = [await img.get_attribute("alt") for img in await cells[3].locator(".img-box img").all()]

            latest_result = {
                "id": draw_id,
                "date": draw_date,
                "sbnameE": draw_sb_name,
                "no": draw_numbers[:-1],
                "sno": draw_numbers[-1]
            }
            print(latest_result)
            
            await browser.close()
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
            return has_update
        except Exception as e:
            print(f"Scraper failed: {e}")
            # Optional: take a screenshot to see what went wrong
            await page.screenshot(path="error.png")
            
        await browser.close()
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

async def main():
    has_update = await scrape_mark_six()
    if has_update:
        take_top_100()
    # check_data()
    return "Finished"

if __name__ == "__main__":
    print(asyncio.run(main()))
