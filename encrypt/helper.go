package encrypt

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"io"
	"os"

	"github.com/pkg/errors"
)

func (ecp *encryptAESImpl) newAEAD(key, nonce []byte) (cipher.AEAD, error) {
	cipherKey, err := aes.NewCipher(key)
	if err != nil {
		return nil, errors.Wrap(err, "create cipher key error")
	}

	return cipher.NewGCMWithNonceSize(cipherKey, len(nonce))
}

func (ecp *encryptAESImpl) generateNonce() ([]byte, error) {
	nonce := make([]byte, GCM_STANDARD_NONCE_SIZE)
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, errors.Wrap(err, "generate nonce error")
	}
	return nonce, nil
}

func (ecp *encryptAESImpl) validateAES256GCMKey(key []byte) error {
	if len(key) != AES_KEY_LENGTH {
		return errors.New("key must be 32 bytes")
	}

	return nil
}

func (ecp *encryptAESImpl) encrypt(key, nonce, plaintext []byte) ([]byte, error) {
	gcm, err := ecp.newAEAD(key, nonce)
	if err != nil {
		return nil, errors.Wrap(err, "create AES256GCM error")
	}

	ciphertext := gcm.Seal(nil, nonce, plaintext, nil)
	return ciphertext, nil
}

func (ecp *encryptAESImpl) encryptAES256GCM(key, nonce, plaintext []byte, buildNonce bool) ([]byte, error) {
	if err := ecp.validateAES256GCMKey(key); err != nil {
		return nil, errors.Wrap(err, "validate AES256GCM key error")
	}

	var nonceByte []byte
	if buildNonce {
		var err error
		nonceByte, err = ecp.generateNonce()
		if err != nil {
			return nil, err
		}
	} else {
		nonceByte = nonce
	}

	ciphertext, err := ecp.encrypt(key, nonceByte, plaintext)
	if err != nil {
		return nil, err
	}

	if buildNonce {
		ciphertext = append(nonceByte, ciphertext...)
	}

	return ciphertext, nil
}

func (ecp *encryptAESImpl) encryptFileAES256GCM(key, nonce []byte, inputFilePath, outputFilePath string, buildNonce bool) error {
	if err := ecp.validateAES256GCMKey(key); err != nil {
		return errors.Wrap(err, "validate AES256GCM key error")
	}

	if err := ecp.encryptFile(key, nonce, inputFilePath, outputFilePath, buildNonce); err != nil {
		return err
	}

	return nil
}

func (ecp *encryptAESImpl) encryptFile(key, nonce []byte, inputFilePath, outputFilePath string, buildNonce bool) error {
	data, err := os.ReadFile(inputFilePath)
	if err != nil {
		return errors.Wrap(err, "read source file error")
	}

	var nonceByte []byte
	if buildNonce {
		var err error
		nonceByte, err = ecp.generateNonce()
		if err != nil {
			return err
		}
	} else {
		nonceByte = nonce
	}

	ciphertext, err := ecp.encrypt(key, nonceByte, data)
	if err != nil {
		return err
	}

	if buildNonce {
		ciphertext = append(nonceByte, ciphertext...)
	}

	if err := os.WriteFile(outputFilePath, ciphertext, FILE_PERMISSION); err != nil {
		return errors.Wrap(err, "write encrypt file error")
	}

	return nil
}

func (ecp *encryptAESImpl) GenerateKey() (string, error) {
	// Base64 encoding converts every 3 bytes (24 bits) of binary data into 4 characters
	key := make([]byte, 24)
	if _, err := io.ReadFull(rand.Reader, key); err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(key), nil
}
