import pytest
from time import sleep
from utils import glob_colors as colors
from selenium.webdriver.common.keys import Keys
from selenium_utils import*

def test_login(chrome_driver,sec):
    print(colors.green+"\nLogin : "+colors.black,end="")
    sleep(sec)
    write(chrome_driver,'input_username','test_bot',sec)
    submit_form(chrome_driver,'form_login')
    sleep(sec)
    check_text(chrome_driver,'span_expand_import_menu','Import menu')
    print(colors.green+",done"+colors.black)


@pytest.mark.lvl1
def test_new_structure(chrome_driver,sec):
    print(colors.green+"\nCreating structure %s" %struct_test+colors.black,end="")
    click(chrome_driver,'expand_import_menu',sec)
    click(chrome_driver,'import_menu_open_btn',sec)
    click(chrome_driver,'new_struct_btn',sec)
    write(chrome_driver,'input_new_struct_name',struct_test,sec)
    check_text(chrome_driver,'span_new_struct_name',struct_test)
    submit_form(chrome_driver,'form_cif')
    check_text(chrome_driver,'structure_panel_name',struct_test)
    click(chrome_driver,'expand_import_menu',sec)
    sleep(1)
    print(colors.green+",done"+colors.black)
