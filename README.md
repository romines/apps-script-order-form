This repository contains a Google Apps Script project done for a craft brewery. It was designed to replace a wholesale ordering process that involved emailing spreadsheet documents back and forth. The ordering application consists of three main parts:

1. Order form
2. Data storage in Google Spreadsheets
3. Email notifications

Data is pulled from two Google spreadsheets are used that are not included here. Perhaps I will make a version of this that is more generic and can inlcude some example spreadsheets.

Some of the form is dynamically generated based on 'products' (beers) pulled in from a beer spreadsheet that looks like this (some of the beers are hardcoded in the script, as they infrequently change):

** View README 'Raw' to make plaintext tables intelligible **

+----------------------------+-----------+----------+--------------------------------------------------------+
| Beer Name                  | Sixth BBL | Half BBL | Description URL (optional)                             |
+----------------------------+-----------+----------+--------------------------------------------------------+
| Rolling Thunder Dortmunder | 30        | 30       | http://www.genericcom/beers/rolling-thunder-dortmunder |
+----------------------------+-----------+----------+--------------------------------------------------------+
| Dim Witbier                | 30        | 30       | http://www.genericbrewing.com/beers/dim-witbier/       |
+----------------------------+-----------+----------+--------------------------------------------------------+
| Dark Kristall              | 30        | 30       | http://www.genericbrewing.com/beer/dark-kristall/      |
+----------------------------+-----------+----------+--------------------------------------------------------+

After orders are submitted, data is recorded in specific spreadsheets for each distributor, retrieved by URL from  a 'Distributors' spreadsheet that looks like this.

+------+---------------+--------------------------------+----------------+----------------+-----------------------------------------+
| ID   | Name          | Order Form                     | Order History  | Order Data     | Testing Order Form                      |
+------+---------------+--------------------------------+----------------+----------------+-----------------------------------------+
| 3508 | Distributor 1 | https://orderForm/exec?d=3508  | spreadsheetURL | spreadsheetURL | https://orderForm/dev?d=3508&debug=true |
+------+---------------+--------------------------------+----------------+----------------+-----------------------------------------+
| 2612 | Distributor 2 | https://orderForm/exec?d=2612  | spreadsheetURL | spreadsheetURL | https://orderForm/dev?d=2612&debug=true |
+------+---------------+--------------------------------+----------------+----------------+-----------------------------------------+
| 9016 | Distributor 3 | https://orderForm//exec?d=9016 | spreadsheetURL | spreadsheetURL | https://orderForm/dev?d=9016&debug=true |
+------+---------------+--------------------------------+----------------+----------------+-----------------------------------------+