# The all target helps automate the whole process: by running `make` from the command line, you can do everything in one go
# You can define further targets that only execute smaller subsets of your data pipeline according to your needs 

year := 2017

all: collect_anime exploration

collect_companies:
	$(info   Extract info on every anime studio / producer)
	node anime_companies_requests.js 

collect_anime:
	$(info   Collect data from the Kitsu API in this section )
	$(info   anime_entries_requests.js collects all base anime_entries for a given year)
	$(info   Here we will process all anime for ${year})
	node anime_entries_requests.js ${year}
	$(info   Obtains the rest of info for every entry in its input year)
	$(info   such as character details, staff info, voice Actor info, reviews, media relationships, etc..)
	node anime_info_request.js ${year}

exploration:
	$(info   Running a script that outputs a word cloud for anime synopsis text)
	node word_cloud.js
	$(info   Running a script that performs characters per anime calculation and amount of anime per year)
	node data_exploration.js

