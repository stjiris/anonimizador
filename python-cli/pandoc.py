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
@click.argument('output_file', type=click.Path(dir_okay=False, exists=False))
def pandoc(filename, output_file):
	file_extension = "."+filename.split(".")[-1]
	if file_extension == ".txt":
		pypandoc.convert_file(filename, "html", format="md", extra_args=["--self-contained","--wrap","none"], outputfile=output_file)
	elif file_extension == ".doc":
		out = docToDocx(filename)
		pypandoc.convert_file(out, "html", extra_args=["--self-contained","--wrap","none"], outputfile=output_file)
		unlink(out)
	else:
		pypandoc.convert_file(filename, "html", extra_args=["--self-contained","--wrap","none"], outputfile=output_file)


if __name__ == "__main__":
	pandoc()