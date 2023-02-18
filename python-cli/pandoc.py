import click
import pypandoc
import sys
import subprocess
from os import unlink, path

sys.stdin.reconfigure(encoding='utf-8') # might not be needed outside windows world
sys.stdout.reconfigure(encoding='utf-8')

def docToDocx(filename: str):
	p = path.basename(filename)
	subprocess.run(["lowriter", "--headless", "--convert-to", "docx", filename], stderr=sys.stderr, stdout=sys.stderr)
	return p.replace(".doc",".docx")
	
@click.command()
@click.argument('filename', type=click.Path(exists=True))
def pandoc(filename):
	html = ""
	file_extension = "."+filename.split(".")[-1]
	if file_extension == ".txt":
		html = pypandoc.convert_file(filename, "html", format="md", extra_args=["--self-contained","--wrap","none"])
	elif file_extension == ".doc":
		out = docToDocx(filename)
		html = pypandoc.convert_file(out, "html", extra_args=["--self-contained","--wrap","none"])
		unlink(out)
	else:
		html = pypandoc.convert_file(filename, "html", extra_args=["--self-contained","--wrap","none"])
	print(html)


if __name__ == "__main__":
	pandoc()