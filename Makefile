up:
	mkdir assets && cp -r themes/boring/static/* assets/ && cp themes/boring/package.json assets/ && cp themes/boring/*.config.js assets/ && cd assets; npm install

gen:
	cargo run -- -g; cd assets; npm run build && mv line-awesome/ static && mv js/ static

dev:
	cargo run -- -d

clean:
	rm -rf assets && rm -rf target
