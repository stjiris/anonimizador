import click
import pypandoc
import sys

sys.stdin.reconfigure(encoding='utf-8') # might not be needed outside windows world
sys.stdout.reconfigure(encoding='utf-8')

@click.command()
@click.argument('filename', type=click.Path(exists=True))
@click.argument('output', type=click.Path())
def pandoc(filename, output):
	docx = pypandoc.convert_file(filename, to="docx", outputfile=output,sandbox=False)

if __name__ == "__main__":
	pandoc()